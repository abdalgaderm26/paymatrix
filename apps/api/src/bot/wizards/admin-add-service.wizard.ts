import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { ServicesService } from '../../services/services.service';

interface AdminAddServiceSession extends Scenes.WizardSessionData {
  serviceName?: string;
  serviceDesc?: string;
  servicePrice?: number;
  serviceDelivery?: string;
}

export interface AdminAddServiceContext extends Scenes.WizardContext<AdminAddServiceSession> {}

@Injectable()
@Wizard('ADMIN_ADD_SERVICE_WIZARD')
export class AdminAddServiceWizard {
  constructor(private readonly servicesService: ServicesService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminAddServiceContext) {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return ctx.scene.leave();

    await ctx.reply(
      '✨ **إضافة خدمة جديدة:**\n\nأرسل اسم الخدمة (مثال: شحن 100 USDT).\n\nأو أرسل /cancel للإلغاء.',
      { parse_mode: 'Markdown' }
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: AdminAddServiceContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    ctx.scene.session.serviceName = msg;
    await ctx.reply('📝 أرسل وصفاً تسويقياً للخدمة (مثال: شحن سريع ومضمون لحسابك).');
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('text')
  async step3(@Ctx() ctx: AdminAddServiceContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    ctx.scene.session.serviceDesc = msg;
    await ctx.reply('💵 أرسل سعر الخدمة بالدولار (أرقام فقط، مثال: 10).');
    ctx.wizard.next();
  }

  @WizardStep(4)
  @On('text')
  async step4(@Ctx() ctx: AdminAddServiceContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    const price = parseFloat(msg);
    if (isNaN(price) || price <= 0) {
      await ctx.reply('الرجاء إدخال السعر بشكل صحيح (أرقام فقط أكبر من 0).');
      return;
    }
    ctx.scene.session.servicePrice = price;
    await ctx.reply('📋 أرسل التعليمات التي ستظهر للعميل أثناء الطلب (مثال: يرجى وضع رقم حسابك البنكي أو عنوان محفظتك).');
    ctx.wizard.next();
  }

  @WizardStep(5)
  @On('text')
  async step5(@Ctx() ctx: AdminAddServiceContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    ctx.scene.session.serviceDelivery = msg;

    // Create the service
    await this.servicesService.create({
      vendor_id: 'api-bot',
      name: ctx.scene.session.serviceName!,
      description: ctx.scene.session.serviceDesc!,
      price_usd: ctx.scene.session.servicePrice!,
      delivery_details: ctx.scene.session.serviceDelivery!
    });

    await ctx.reply(
      `✅ **تمت إضافة الخدمة بنجاح!**\n\nالاسم: ${ctx.scene.session.serviceName}\nالسعر: $${ctx.scene.session.servicePrice}\n\nالخدمة الآن مفعلة ومتاحة للعملاء.`,
      { parse_mode: 'Markdown' }
    );
    return ctx.scene.leave();
  }
}
