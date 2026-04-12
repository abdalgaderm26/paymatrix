import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { UsersService } from '../../users/users.service';

interface AdminUsersSession extends Scenes.WizardSessionData {
  targetUserId?: number;
  operation?: 'ADD' | 'DEDUCT';
}

export interface AdminUsersContext extends Scenes.WizardContext<AdminUsersSession> {}

@Injectable()
@Wizard('ADMIN_USERS_WIZARD')
export class AdminUsersWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminUsersContext) {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return ctx.scene.leave();

    await ctx.reply('👥 **إدارة المستخدمين:**\nيرجى إرسال الآيدي (Telegram ID) الخاص بالمستخدم الذي تريد إدارته:\n\nللإلغاء أرسل /cancel', { parse_mode: 'Markdown' });
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: AdminUsersContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    const tId = parseInt(msg);
    if (isNaN(tId)) {
       await ctx.reply('الرجاء إرسال أيدي صحيح (أرقام فقط).');
       return;
    }

    const user = await this.usersService.findByTelegramId(tId);
    if (!user) {
       await ctx.reply('❌ لم يتم العثور على مستخدم بهذا الآيدي في قاعدة البيانات.');
       return ctx.scene.leave();
    }

    ctx.scene.session.targetUserId = tId;

    await ctx.reply(`✅ تم العثور على المستخدم:\nالاسم: ${user.full_name}\nالرصيد الحالي: $${user.wallet_balance}\n\nماذا تريد أن تفعل بهذا الحساب؟`, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback('➕ إضافة رصيد', 'op_add')],
        [Markup.button.callback('➖ خصم رصيد', 'op_deduct')],
        [Markup.button.callback('🚫 إلغاء', 'op_cancel')]
      ])
    });
    // Wait for callback query in the next step
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('callback_query')
  async step3(@Ctx() ctx: AdminUsersContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const action = (ctx.callbackQuery as any).data;

    if (action === 'op_cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    if (action === 'op_add' || action === 'op_deduct') {
      ctx.scene.session.operation = action === 'op_add' ? 'ADD' : 'DEDUCT';
      await ctx.reply(`حسناً، يرجى إرسال المبلغ بالدولار (أرقام فقط):`);
      ctx.wizard.next();
    }
  }

  @WizardStep(4)
  @On('text')
  async step4(@Ctx() ctx: AdminUsersContext, @Message('text') msg: string) {
    if (msg === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    const amount = parseFloat(msg);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('الرجاء إدخال مبلغ صحيح أكبر من 0.');
      return;
    }

    const tId = ctx.scene.session.targetUserId;
    const op = ctx.scene.session.operation;
    if (!tId || !op) return ctx.scene.leave();

    const user = await this.usersService.findByTelegramId(tId);
    if (!user) return ctx.scene.leave();

    if (op === 'ADD') {
      user.wallet_balance += amount;
      try {
        await ctx.telegram.sendMessage(tId, `🎉 **تهانينا!**\nتم إضافة مبلغ *$${amount}* إلى محفظتك من قبل الإدارة.\nرصيدك الحالي: *$${user.wallet_balance}*`, { parse_mode: 'Markdown' });
      } catch (e) {
        // user might have blocked the bot, we still add the money
      }
    } else {
      user.wallet_balance = Math.max(0, user.wallet_balance - amount); // Prevents negative balance
      try {
        await ctx.telegram.sendMessage(tId, `⚠️ **إشعار من الإدارة:**\nتم خصم مبلغ *$${amount}* من محفظتك.\nرصيدك الحالي: *$${user.wallet_balance}*`, { parse_mode: 'Markdown' });
      } catch (e) {}
    }

    await user.save();
    
    await ctx.reply(`✅ تمت العملية بنجاح.\nتم ${op === 'ADD' ? 'إضافة' : 'خصم'} $${amount}.\nالرصيد الجديد للمستخدم: $${user.wallet_balance}`);
    ctx.scene.leave();
  }
}
