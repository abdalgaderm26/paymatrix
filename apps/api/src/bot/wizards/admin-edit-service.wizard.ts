import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { ServicesService } from '../../services/services.service';

interface EditServiceState {
  serviceId?: string;
  field?: string; // name | price | desc | delivery
}

export interface AdminEditServiceContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<AdminEditServiceContext> & {
    state: EditServiceState;
  };
}

@Injectable()
@Wizard('ADMIN_EDIT_SERVICE_WIZARD')
export class AdminEditServiceWizard {
  constructor(private readonly servicesService: ServicesService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminEditServiceContext) {
    const state = ctx.wizard.state || (ctx.scene.session as any).state;
    if (!state?.serviceId || !state?.field) {
      await ctx.reply('❌ حدث خطأ.');
      return ctx.scene.leave();
    }
    // Store in wizard state
    ctx.wizard.state.serviceId = state.serviceId;
    ctx.wizard.state.field = state.field;
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: AdminEditServiceContext, @Message('text') msg: string) {
    if (msg === '/cancel' || msg.startsWith('/')) {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    const { serviceId, field } = ctx.wizard.state;
    if (!serviceId || !field) return ctx.scene.leave();

    const updateData: any = {};
    const fieldMap: Record<string, string> = { name: 'name', price: 'price_usd', desc: 'description', delivery: 'delivery_details' };
    const fieldLabels: Record<string, string> = { name: 'الاسم', price: 'السعر', desc: 'الوصف', delivery: 'تفاصيل التسليم' };

    if (field === 'price') {
      const price = parseFloat(msg);
      if (isNaN(price) || price <= 0) {
        await ctx.reply('❌ أدخل رقماً صحيحاً أكبر من 0.');
        return;
      }
      updateData[fieldMap[field]] = price;
    } else {
      updateData[fieldMap[field]] = msg;
    }

    const updated = await this.servicesService.update(serviceId, updateData);
    if (updated) {
      await ctx.reply(`✅ تم تحديث ${fieldLabels[field]} بنجاح!\n\nالقيمة الجديدة: ${field === 'price' ? '$' + msg : msg}`);
    } else {
      await ctx.reply('❌ الخدمة غير موجودة.');
    }
    return ctx.scene.leave();
  }
}
