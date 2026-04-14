import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { SettingsService } from '../../settings/settings.service';

interface AdminAddWalletSession extends Scenes.WizardSessionData {
  walletLabel?: string;
}

export interface AdminAddWalletContext extends Scenes.WizardContext<AdminAddWalletSession> {}

@Injectable()
@Wizard('ADMIN_ADD_WALLET_WIZARD')
export class AdminAddWalletWizard {
  constructor(private readonly settingsService: SettingsService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminAddWalletContext) {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return ctx.scene.leave();

    await ctx.reply(
      '🏦 **إضافة محفظة / بنك جديد:**\n\nأرسل اسم البنك أو المحفظة الذي تريد إضافته (مثال: بنكك - الخرطوم، زين كاش، إلخ).\n\nأو أرسل /cancel للإلغاء.',
      { parse_mode: 'Markdown' }
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: AdminAddWalletContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    ctx.scene.session.walletLabel = msg;
    await ctx.reply('📝 أرسل رقم الحساب أو بيانات التحويل الخاصة بهذه المحفظة ليراها العميل.');
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('text')
  async step3(@Ctx() ctx: AdminAddWalletContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    const walletValue = msg;
    const walletLabel = ctx.scene.session.walletLabel!;

    const customWalletsRaw = await this.settingsService.getSetting('CUSTOM_WALLETS');
    let customWallets: { key: string, label: string, value: string }[] = [];
    if (customWalletsRaw) {
      try {
        customWallets = JSON.parse(customWalletsRaw);
      } catch (e) {}
    }

    const newKey = `custom_${Date.now()}`;
    customWallets.push({ key: newKey, label: walletLabel, value: walletValue });

    await this.settingsService.setSetting('CUSTOM_WALLETS', JSON.stringify(customWallets));

    await ctx.reply(
      `✅ **تمت إضافة المحفظة بنجاح!**\n\nالاسم: ${walletLabel}\nالبيانات: ${walletValue}\n\nستظهر الآن كخيار متاح لإيداع العملاء.`,
      { parse_mode: 'Markdown' }
    );
    return ctx.scene.leave();
  }
}
