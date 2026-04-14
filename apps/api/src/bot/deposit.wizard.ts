import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { i18n, isMenuButton } from './i18n';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { SettingsService, DEFAULT_WALLETS } from '../settings/settings.service';

interface MyWizardSession extends Scenes.WizardSessionData {
  depositAmount?: number;
  paymentMethodKey?: string;
  paymentMethodLabel?: string;
  paymentMethodValue?: string;
}

export interface WizardContext extends Scenes.WizardContext<MyWizardSession> {}

@Injectable()
@Wizard('DEPOSIT_WIZARD')
export class DepositWizard {
  constructor(
    private readonly usersService: UsersService,
    private readonly settingsService: SettingsService,
    private readonly transactionsService: TransactionsService,
  ) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: WizardContext) {
    const from = ctx.from;
    const user = from ? await this.usersService.findByTelegramId(from.id) : null;
    const t = i18n[(user?.language as keyof typeof i18n) || 'ar'];

    await ctx.reply(
      t.language_changed === '✅ Language changed to English.'
        ? 'Please enter the amount you want to deposit in USD (e.g. 10):\n\nOr send /cancel to abort.'
        : 'يرجى إدخال المبلغ المراد إيداعه بالدولار (مثال: 10):\n\nأو أرسل /cancel للإلغاء.',
    );

    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: WizardContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || isMenuButton(msg)) {
      await ctx.reply('تم الإلغاء. يرجى اختيار الإجراء من القائمة.');
      return ctx.scene.leave();
    }

    const amount = parseFloat(msg);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('مبلغ غير صالح. يرجى إدخال رقم صحيح.');
      return;
    }

    ctx.scene.session.depositAmount = amount;

    const allWallets = await this.settingsService.getAllDepositMethods();
    const availableWallets = allWallets.filter((w) => {
      return w.value && w.value !== 'غير محدد' && w.value.trim() !== '';
    });

    if (availableWallets.length === 0) {
      await ctx.reply('عذراً، بوابات الدفع قيد الصيانة حالياً. يرجى المحاولة لاحقاً.');
      return ctx.scene.leave();
    }

    const buttons = availableWallets.map((w) => {
      const def = DEFAULT_WALLETS.find(d => d.key === w.key);
      const label = w.label || (def ? def.label : w.key);
      return [Markup.button.callback(`التحويل عبر: ${label}`, `pay_${w.key}`)];
    });
    buttons.push([Markup.button.callback('🚫 إلغاء العملية', 'cancel_deposit')]);

    const rateStr = await this.settingsService.getSetting('EXCHANGE_RATE_SDG');
    const rate = rateStr ? parseFloat(rateStr) : 1970;
    const sdgAmount = Math.round(amount * rate);
    const amountFormatted = `$${amount.toLocaleString()} (≈ ${sdgAmount.toLocaleString()} SDG)`;

    await ctx.reply(
      `المبلغ المطلوب: ${amountFormatted}\n\nيرجى اختيار طريقة الدفع التي تفضلها من القائمة أدناه:`,
      { ...Markup.inlineKeyboard(buttons) },
    );

    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('callback_query')
  async step3(@Ctx() ctx: WizardContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const data = (ctx.callbackQuery as any).data;

    if (data === 'cancel_deposit') {
      await ctx.reply('تم إلغاء عملية الإيداع.');
      return ctx.scene.leave();
    }

    if (data && data.startsWith('pay_')) {
      const methodKey = data.split('pay_')[1];
      const allWallets = await this.settingsService.getAllDepositMethods();
      const dbW = allWallets.find((w) => w.key === methodKey);
      const labelDef = DEFAULT_WALLETS.find((w) => w.key === methodKey);

      if (!dbW || !labelDef) {
        await ctx.reply('حدث خطأ. يرجى إعادة المحاولة.');
        return ctx.scene.leave();
      }

      ctx.scene.session.paymentMethodKey = methodKey;
      ctx.scene.session.paymentMethodLabel = labelDef.label;
      ctx.scene.session.paymentMethodValue = dbW.value;

      const rateStr = await this.settingsService.getSetting('EXCHANGE_RATE_SDG');
      const rate = rateStr ? parseFloat(rateStr) : 1970;
      const amountFormat = `$${ctx.scene.session.depositAmount} (≈ ${Math.round(ctx.scene.session.depositAmount! * rate).toLocaleString()} SDG)`;

      await ctx.reply(
        `اخترت الدفع عبر: **${labelDef.label}**\n\n📌 **بيانات التحويل الخاصة بنا:**\n\`${dbW.value}\`\n\nيرجى تحويل مبلغ ${amountFormat} ثم إرسال **صورة إيصال التحويل** هنا ليتم التحقق منها.`,
        { parse_mode: 'Markdown' },
      );
      ctx.wizard.next();
    }
  }

  @WizardStep(4)
  @On('photo')
  async step4(@Ctx() ctx: WizardContext, @Message() msg: any) {
    const photo = msg.photo;
    if (!photo || photo.length === 0) {
      await ctx.reply('الرجاء إرسال صورة الإيصال كصورة ليتم التحقق منها (أو أرسل /cancel للإلغاء).');
      return;
    }

    const fileId = photo[photo.length - 1].file_id;
    const from = ctx.from;
    if (!from) return ctx.scene.leave();

    const user = await this.usersService.findByTelegramId(from.id);
    if (!user) return ctx.scene.leave();

    // Save transaction to database
    await this.transactionsService.create({
      user_id: user._id as any,
      type: 'deposit',
      amount: ctx.scene.session.depositAmount || 0,
      method: ctx.scene.session.paymentMethodLabel || 'unknown',
      status: 'pending',
      proof_file_id: fileId,
    });

    await ctx.reply(
      '✅ تم استلام طلب الإيداع بنجاح!\n\n' +
      `💵 المبلغ: $${ctx.scene.session.depositAmount}\n` +
      `🏦 الطريقة: ${ctx.scene.session.paymentMethodLabel}\n\n` +
      'سيتم مراجعته من قبل الإدارة وإضافة الرصيد قريباً.',
    );

    // Notify admins
    try {
      const admins = await this.usersService.getAdmins();
      const adminIds = new Set(admins.map(a => a.telegram_id.toString()));
      if (process.env.ADMIN_ID) adminIds.add(process.env.ADMIN_ID);
      
      for (const adminId of adminIds) {
        try {
          await (ctx as any).telegram.sendPhoto(adminId, fileId, {
            caption:
              `📥 **طلب إيداع جديد!**\n\n` +
              `👤 ${user.full_name} (@${user.username || 'N/A'})\n` +
              `🆔 ${from.id}\n` +
              `💵 المبلغ: $${ctx.scene.session.depositAmount}\n` +
              `🏦 الطريقة: ${ctx.scene.session.paymentMethodLabel}`,
            parse_mode: 'Markdown',
          });
        } catch (err) {}
      }
    } catch {}

    ctx.scene.leave();
  }

  @WizardStep(4)
  @On('text')
  async step4Text(@Ctx() ctx: WizardContext, @Message('text') msg: string) {
    if (msg.startsWith('/')) {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }
    await ctx.reply('الرجاء إرسال **صورة إيصال التحويل** ليتم استكمال الطلب.', { parse_mode: 'Markdown' });
  }
}
