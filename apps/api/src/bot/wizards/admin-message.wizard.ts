import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { UsersService } from '../../users/users.service';

interface AdminMessageSession extends Scenes.WizardSessionData {
  targetTelegramId?: string;
  targetName?: string;
}

export interface AdminMessageContext extends Scenes.WizardContext<AdminMessageSession> {}

@Injectable()
@Wizard('ADMIN_MESSAGE_USER_WIZARD')
export class AdminMessageUserWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminMessageContext) {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return ctx.scene.leave();

    const state = ctx.scene.session.state as any;
    if (!state || !state.telegramId) {
      await ctx.reply('❌ حدث خطأ، لم يتم تحديد العميل.');
      return ctx.scene.leave();
    }

    const tId = state.telegramId;
    const user = await this.usersService.findByTelegramId(tId);
    
    ctx.scene.session.targetTelegramId = tId;
    ctx.scene.session.targetName = user?.full_name || tId;

    await ctx.reply(
      `✉️ **مراسلة العميل: ${ctx.scene.session.targetName}**\n\nقم بإرسال رسالتك الآن ليتم إيصالها للعميل باسم البوت (يدعم النصوص، الصور، والملفات).\n\nأو يمكنك الإرسال /cancel للعودة للإدارة.`,
      { parse_mode: 'Markdown' }
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('message')
  async step2(@Ctx() ctx: AdminMessageContext, @Message() msg: any) {
    if (msg.text === '/cancel') {
      await ctx.reply('تم إلغاء المراسلة.');
      return ctx.scene.leave();
    }

    if (msg.text && (msg.text.includes('رجوع') || msg.text.includes('لوحة'))) {
      return ctx.scene.leave();
    }

    const targetId = ctx.scene.session.targetTelegramId;
    if (!targetId) return ctx.scene.leave();

    try {
      // Forward the admin's entire message to the user:
      await ctx.telegram.sendMessage(targetId, '📨 **رسالة جديدة من فريق الإدارة:**', { parse_mode: 'Markdown' });
      await ctx.telegram.copyMessage(targetId, msg.chat.id, msg.message_id);
      
      await ctx.reply(`✅ **تم إرسال رسالتك بنجاح إلى العميل!**`, { parse_mode: 'Markdown' });
    } catch (err) {
      await ctx.reply(`❌ **فشل الإرسال:** قد يكون العميل قد قام بحظر البوت أو حذفه.`);
    }

    return ctx.scene.leave();
  }
}
