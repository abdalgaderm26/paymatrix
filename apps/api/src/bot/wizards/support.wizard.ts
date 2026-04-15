import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes, Markup } from 'telegraf';
import { UsersService } from '../../users/users.service';
import { i18n } from '../i18n';

export interface SupportContext extends Scenes.WizardContext {}

@Injectable()
@Wizard('SUPPORT_WIZARD')
export class SupportWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: SupportContext) {
    await ctx.reply(
      '🎧 **فريق الدعم الفني لخدمتك:**\n\nتفضل واكتب لنا استفسارك أو مشكلتك في رسالة واحدة (يمكنك إرفاق صور إن شئت).\n\nأو يمكنك دائماً الخروج بالضغط على /cancel',
      { parse_mode: 'Markdown' }
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('message')
  async step2(@Ctx() ctx: SupportContext, @Message() msg: any) {
    if (msg.text === '/cancel') {
      await ctx.reply('تم إلغاء تواصل الدعم.');
      // Return to /start which rebuilds the keyboard properly
      return ctx.scene.leave();
    }

    if (msg.text && (msg.text.includes('رجوع') || msg.text.includes('لوحة') || msg.text.includes('الخدمات'))) {
      return ctx.scene.leave();
    }

    const from = msg.from;
    const user = await this.usersService.findByTelegramId(from.id);
    const userInfo = `👤 ${from.first_name} (@${from.username || 'بلا_يوزر'})\n🆔: \`${from.id}\`\n💰 الرصيد الحالي: $${user?.wallet_balance || 0}`;

    // Notify ALL admins (not just main admin)
    try {
      const admins = await this.usersService.getAdmins();
      const adminIds = new Set(admins.map(a => a.telegram_id.toString()));
      if (process.env.ADMIN_ID) adminIds.add(process.env.ADMIN_ID);

      for (const adminId of adminIds) {
        try {
          await ctx.telegram.sendMessage(adminId, `📥 **تذكرة دعم جديدة!**\n\n${userInfo}`, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✉️ الرد على العميل', `msg_user_${from.id}`)]
            ])
          });
          await ctx.telegram.copyMessage(adminId, msg.chat.id, msg.message_id);
        } catch {}
      }
    } catch {}

    await ctx.reply(
      '✅ **تم إرسال تذكرتك بنجاح لفريق المبيعات والدعم الفني.**\nسيتم الرد عليك في أسرع وقت. شكراً لتواصلك!',
      { parse_mode: 'Markdown' }
    );

    return ctx.scene.leave();
  }
}
