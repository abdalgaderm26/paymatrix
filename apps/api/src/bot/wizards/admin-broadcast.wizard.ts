import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes } from 'telegraf';
import { UsersService } from '../../users/users.service';

export interface AdminBroadcastContext extends Scenes.WizardContext {}

@Injectable()
@Wizard('ADMIN_BROADCAST_WIZARD')
export class AdminBroadcastWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminBroadcastContext) {
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return ctx.scene.leave();

    await ctx.reply(
      '📢 **الإرسال الجماعي:**\n\nأرسل الرسالة التي تريد إرسالها لجميع المستخدمين (يمكن أن تحتوى على نصوص، وصور، وفيديو).\n\nأو أرسل /cancel للإلغاء.',
      { parse_mode: 'Markdown' }
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('message')
  async step2(@Ctx() ctx: AdminBroadcastContext, @Message() msg: any) {
    if (msg.text === '/cancel') {
      await ctx.reply('تم الإلغاء.');
      return ctx.scene.leave();
    }

    if (msg.text && (msg.text.includes('رجوع') || msg.text.includes('لوحة'))) {
       return ctx.scene.leave();
    }

    const { users } = await this.usersService.findAll(1, 999999); // get all users
    let successCount = 0;
    let failCount = 0;

    await ctx.reply(`دقيقة، جاري الإرسال إلى ${users.length} مستخدم... ⏳`);

    for (const user of users) {
      if (user.telegram_id.toString() === process.env.ADMIN_ID) continue;
      try {
        await ctx.telegram.copyMessage(user.telegram_id, msg.chat.id, msg.message_id);
        successCount++;
      } catch (error) {
        failCount++;
        // user might have blocked the bot, skip
      }
      // Sleep a bit to avoid hitting Telegram API limits
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    await ctx.reply(
      `✅ **اكتمل الإرسال الجماعي!**\n\n` +
      `نجاح: ${successCount}\n` +
      `فشل (حظروا البوت): ${failCount}`,
      { parse_mode: 'Markdown' }
    );

    return ctx.scene.leave();
  }
}
