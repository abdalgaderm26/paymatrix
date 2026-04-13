import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Markup, Scenes } from 'telegraf';
import { UsersService } from '../../users/users.service';

interface AdminUsersState {
  targetUserId?: number;
  operation?: 'ADD' | 'DEDUCT';
  searchMode?: boolean;
}

export interface AdminUsersContext extends Scenes.WizardContext {
  wizard: Scenes.WizardContextWizard<AdminUsersContext> & {
    state: AdminUsersState;
  };
}

@Injectable()
@Wizard('ADMIN_USERS_WIZARD')
export class AdminUsersWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminUsersContext) {
    const fromId = ctx.from?.id;
    if (!fromId) return ctx.scene.leave();
    const adminStr = process.env.ADMIN_ID;
    
    // Auth check
    let isAdmin = fromId.toString() === adminStr;
    if (!isAdmin) {
      const user = await this.usersService.findByTelegramId(fromId);
      if (user?.role === 'admin') isAdmin = true;
    }
    if (!isAdmin) return ctx.scene.leave();

    const state = ctx.wizard.state;

    if (state.searchMode) {
      await ctx.reply('🔍 **البحث عن مستخدم:**\nيرجى إرسال اسم المستخدم أو الآيدي (ID):\n\nللإلغاء أرسل /cancel أو اضغط على أحد الأزرار.', { parse_mode: 'Markdown' });
      ctx.wizard.next();
      return;
    }

    if (state.operation && state.targetUserId) {
      const opText = state.operation === 'ADD' ? 'إضافة' : 'خصم';
      await ctx.reply(`أرسل المبلغ بالدولار الذي تود ${opText}ه (مثال: 10):\n\nللإلغاء أرسل /cancel`, { parse_mode: 'Markdown' });
      ctx.wizard.selectStep(2);
      return;
    }

    return ctx.scene.leave();
  }

  @WizardStep(2)
  @On('text')
  async step2Search(@Ctx() ctx: AdminUsersContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || msg.includes('رجوع') || msg.includes('لوحة')) {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    const state = ctx.wizard.state;
    if (!state.searchMode) return ctx.scene.leave();

    const { users } = await this.usersService.findAll(1, 10, msg);
    if (users.length === 0) {
      await ctx.reply('❌ لم يتم العثور على أي مستخدم يطابق بحثك.\nانتهى البحث.');
      return ctx.scene.leave();
    }

    const buttons = users.map(u => [
       Markup.button.callback(`👤 ${u.full_name} | $${u.wallet_balance}`, `admin_u_opts_${u.telegram_id}`)
    ]);
    buttons.push([Markup.button.callback('بحث جديد 🔄', 'admin_search_users')]);

    await ctx.reply(`✅ وجدنا ${users.length} نتائج:\nاختر مستخدماً:`, {
      ...Markup.inlineKeyboard(buttons)
    });
    return ctx.scene.leave();
  }

  @WizardStep(3)
  @On('text')
  async step3Amount(@Ctx() ctx: AdminUsersContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || msg.includes('رجوع') || msg.includes('لوحة')) {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    const state = ctx.wizard.state;
    const amount = parseFloat(msg);
    if (isNaN(amount) || amount <= 0) {
      await ctx.reply('الرجاء إدخال مبلغ صحيح أكبر من 0.');
      return;
    }

    const tId = state.targetUserId;
    const op = state.operation;
    if (!tId || !op) return ctx.scene.leave();

    const user = await this.usersService.findByTelegramId(tId);
    if (!user) return ctx.scene.leave();

    if (op === 'ADD') {
      user.wallet_balance += amount;
      try {
        await ctx.telegram.sendMessage(tId, `🎉 **تهانينا!**\nتم إضافة مبلغ *$${amount}* إلى محفظتك من قبل الإدارة.\nرصيدك الحالي: *$${user.wallet_balance}*`, { parse_mode: 'Markdown' });
      } catch (e) {}
    } else {
      user.wallet_balance = Math.max(0, user.wallet_balance - amount);
      try {
        await ctx.telegram.sendMessage(tId, `⚠️ **إشعار من الإدارة:**\nتم خصم مبلغ *$${amount}* من محفظتك.\nرصيدك الحالي: *$${user.wallet_balance}*`, { parse_mode: 'Markdown' });
      } catch (e) {}
    }

    await user.save();
    
    await ctx.reply(`✅ تمت العملية بنجاح.\nتم ${op === 'ADD' ? 'إضافة' : 'خصم'} $${amount}.\nالرصيد الجديد للمستخدم: $${user.wallet_balance}`);
    return ctx.scene.leave();
  }
}
