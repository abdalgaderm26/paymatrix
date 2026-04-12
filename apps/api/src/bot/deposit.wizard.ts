import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { i18n } from './i18n';
import { UsersService } from '../users/users.service';

export interface WizardContext extends Scenes.WizardContext {
  session: Scenes.WizardSessionData & {
    depositAmount?: number;
    paymentMethod?: string;
  };
}

@Injectable()
@Wizard('DEPOSIT_WIZARD')
export class DepositWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: WizardContext) {
    const from = ctx.from;
    const user = from ? await this.usersService.findByTelegramId(from.id) : null;
    const t = i18n[(user?.language as keyof typeof i18n) || 'ar'];

    await ctx.reply(t.language_changed === '✅ Language changed to English.' 
      ? 'Please enter the amount you want to deposit in USD (e.g. 10):'
      : 'يرجى إدخال المبلغ المراد إيداعه بالدولار (مثال: 10):');
    
    ctx.wizard.next();
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: WizardContext, @Message('text') msg: string) {
    const amount = parseFloat(msg);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('مبلغ غير صالح. يرجى إدخال رقم صحيح.');
      return;
    }

    ctx.session.depositAmount = amount;
    
    await ctx.reply(`المبلغ: $${amount}\n\nطرق الدفع المتاحة:\n1. العملات الرقمية USDT (TRC20)\nالعنوان: \`TYourUSDTAddressHere\`\n2. تحويل بنكي (رقم الحساب 123456789)\n\nيرجى إرسال **صورة إيصال التحويل** هنا:`, { parse_mode: 'Markdown' });
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('photo')
  async step3(@Ctx() ctx: WizardContext, @Message() msg: any) {
    const photo = msg.photo;
    if (!photo || photo.length === 0) {
      await ctx.reply('الرجاء إرسال صورة الإيصال ليتم التحقق منها.');
      return;
    }

    const fileId = photo[photo.length - 1].file_id;
    
    // Here we should save to DB in "transactions" table with status pending.
    
    await ctx.reply('✅ تم استلام طلب الإيداع. سيتم مراجعته من قبل الإدارة وإضافة الرصيد قريباً.');
    ctx.scene.leave();
  }
}
