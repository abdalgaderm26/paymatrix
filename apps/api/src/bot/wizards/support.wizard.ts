import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { Scenes, Markup } from 'telegraf';
import { UsersService } from '../../users/users.service';

export interface SupportContext extends Scenes.WizardContext {}

@Injectable()
@Wizard('SUPPORT_WIZARD')
export class SupportWizard {
  constructor(private readonly usersService: UsersService) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: SupportContext) {
    await ctx.reply(
      '🎧 **فريق الدعم الفني لخدمتك:**\n\nتفضل واكتب لنا استفسارك أو مشكلتك في رسالة واحدة (يمكنك إرفاق صور إن شئت).\n\nأو يمكنك دائماً الخروج بالضغط على /cancel',
      { parse_mode: 'Markdown', reply_markup: { remove_keyboard: true } }
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('message')
  async step2(@Ctx() ctx: SupportContext, @Message() msg: any) {
    if (msg.text === '/cancel') {
      await ctx.reply('تم إلغاء تواصل الدعم وفتح القوائم.', {
        reply_markup: {
          keyboard: [
            ['الخدمات 📦', 'رصيدي 💰'],
            ['طلباتي 📋', 'إيداع رصيد 📥'],
            ['رابط الدعوة 🔗', 'الدعم الفني 🎧'],
            ['اللغة 🌐']
          ],
          resize_keyboard: true
        }
      });
      return ctx.scene.leave();
    }

    if (msg.text && (msg.text.includes('رجوع') || msg.text.includes('لوحة') || msg.text.includes('الخدمات'))) {
      return ctx.scene.leave(); // In case they clicked a keyboard button right as it got removed
    }

    const from = msg.from;
    const user = await this.usersService.findByTelegramId(from.id);
    const userInfo = `👤 ${from.first_name} (@${from.username || 'بلا_يوزر'})\n🆔: \`${from.id}\`\n💰 الرصيد الحالي: $${user?.wallet_balance || 0}`;

    try {
      const adminId = process.env.ADMIN_ID;
      if (adminId) {
        await ctx.telegram.sendMessage(adminId, `📥 **تذكرة دعم جديدة!**\n\n${userInfo}`, { parse_mode: 'Markdown' });
        await ctx.telegram.copyMessage(adminId, msg.chat.id, msg.message_id);
      }
    } catch {}

    await ctx.reply(
      '✅ **تم إرسال تذكرتك بنجاح لفريق المبيعات والدعم الفني.**\nسيتم الرد عليك في أسرع وقت. شكراً لتواصلك!',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          keyboard: [
            ['الخدمات 📦', 'رصيدي 💰'],
            ['طلباتي 📋', 'إيداع رصيد 📥'],
            ['رابط الدعوة 🔗', 'الدعم الفني 🎧'],
            ['اللغة 🌐']
          ],
          resize_keyboard: true
        }
      }
    );

    return ctx.scene.leave();
  }
}
