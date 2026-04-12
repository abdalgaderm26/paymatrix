import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SettingsService, DEFAULT_WALLETS } from '../../settings/settings.service';

interface AdminSettingsSession extends Scenes.WizardSessionData {
  walletKey?: string;
  walletLabel?: string;
}

export interface AdminSettingsContext extends Scenes.WizardContext<AdminSettingsSession> {}

@Injectable()
@Wizard('ADMIN_SETTINGS_WIZARD')
export class AdminSettingsWizard {
  constructor(private readonly settingsService: SettingsService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminSettingsContext) {
    const state = ctx.scene.session.state as any;
    if (!state || !state.walletKey) {
      await ctx.reply('❌ حدث خطأ، لم يتم تحديد المحفظة.');
      return ctx.scene.leave();
    }

    ctx.scene.session.walletKey = state.walletKey;
    const def = DEFAULT_WALLETS.find(w => w.key === state.walletKey);
    ctx.scene.session.walletLabel = def?.label || state.walletKey;

    await ctx.reply(`أنت الآن تقوم بتعديل إعدادات محفظة: **${ctx.scene.session.walletLabel}**\n\nيرجى إرسال رقم الحساب أو العنوان الجديد. (يمكنك إرسال تفاصيل معقدة مثل: "الاسم: فلان، الرقم: 12345")\n\nأو يمكنك الإرسال /cancel للإلغاء.`, { parse_mode: 'Markdown' });
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: AdminSettingsContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    const walletKey = ctx.scene.session.walletKey;
    if (!walletKey) return ctx.scene.leave();

    await this.settingsService.setSetting(walletKey, msg);
    
    await ctx.reply(`✅ تم تحديث بيانات الدفع لـ **${ctx.scene.session.walletLabel}** بنجاح!\n\nالقيمة الجديدة:\n${msg}`, { parse_mode: 'Markdown' });
    ctx.scene.leave();
  }
}
