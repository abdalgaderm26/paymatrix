import { UseGuards } from '@nestjs/common';
import { Start, Update, Ctx, Help, Action, On, Command } from 'nestjs-telegraf';
import { Context, Markup, Scenes } from 'telegraf';
import { UsersService } from '../users/users.service';
import { ServicesService } from '../services/services.service';
import { i18n } from './i18n';
import { BanGuard } from './guards/ban.guard';

@Update()
@UseGuards(BanGuard)
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly servicesService: ServicesService
  ) { }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.message?.from;
    if (!from) return;

    // Create or find user in DB
    const user = await this.usersService.findOrCreate(
      from.id,
      from.username || '',
      [from.first_name, from.last_name].filter(Boolean).join(' ')
    );

    // Referral check
    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text;
      if (text.startsWith('/start ref_')) {
        const referredBy = parseInt(text.split('_')[1]);
        if (!isNaN(referredBy) && referredBy !== from.id) {
          // We could check if user already existed before creating
          if (!user.referred_by && user.createdAt === user.updatedAt) {
            user.referred_by = referredBy;
            await user.save();
          }
        }
      }
    }

    const t = i18n[user.language as keyof typeof i18n] || i18n.ar;

    // Check if is admin
    const isAdmin = from.id.toString() === process.env.ADMIN_ID;
    const adminBtn = isAdmin ? [[Markup.button.callback('🛡️ لوحة الإدارة', 'admin_panel')]] : [];

    await ctx.reply(t.welcome(user.full_name, user.wallet_balance) + `\n\n🔗 رابط الدعوة الخاص بك لربح المكافآت:\nhttps://t.me/PayMatrixBot?start=ref_${from.id}`, {
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t.btn_services, 'view_services')],
        [Markup.button.callback(t.btn_wallet, 'view_wallet'), Markup.button.callback(t.btn_orders, 'view_orders')],
        [Markup.button.callback(t.btn_support, 'support'), Markup.button.callback(t.btn_language, 'change_language')],
        ...adminBtn
      ])
    });
  }

  @Command('admin')
  @Action('admin_panel')
  async onAdminPanel(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();

    const from = ctx.from;
    if (!from || from.id.toString() !== process.env.ADMIN_ID) return;

    await ctx.reply('🛡️ **لوحة التحكم الإدارية السريعة:**\nاختر العملية التي تريد تنفيذها:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback('🎁 إرسال مكافأة لمستخدم', 'admin_reward')],
        [Markup.button.callback('🚫 حظر مستخدم', 'admin_ban_user')],
        [Markup.button.callback('🎟️ إنشاء كوبون', 'admin_create_coupon')]
      ])
    });
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply('مرحباً بك في نظام المساعدة. يرجى اختيار طلب المساعدة من القائمة الرئيسية.');
  }

  @Action('view_services')
  async onServicesAction(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const from = ctx.callbackQuery?.from;
    if (!from) return;
    const user = await this.usersService.findByTelegramId(from.id);
    const t = i18n[(user?.language as keyof typeof i18n) || 'ar'];

    const services = await this.servicesService.findAllActive();

    if (services.length === 0) {
      await ctx.reply(t.services_wip);
      return;
    }

    const buttons = services.map(s => [Markup.button.callback(`🔹 ${s.name} - $${s.price_usd}`, `s_${s._id.toString()}`)]);
    buttons.push([Markup.button.callback(t.btn_back, 'back_home')]);

    await ctx.reply('الخدمات المتوفرة حالياً:\nاختر خدمة لمعرفة المزيد:', {
      ...Markup.inlineKeyboard(buttons)
    });
  }

  @Action('view_wallet')
  async onWalletAction(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const from = ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    if (!user) return;
    const t = i18n[user.language as keyof typeof i18n] || i18n.ar;

    await ctx.reply(t.wallet_info(user.wallet_balance), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t.btn_deposit, 'deposit')],
        [Markup.button.callback(t.btn_back, 'back_home')]
      ])
    });
  }

  @Action('deposit')
  async onDepositAction(@Ctx() ctx: Scenes.SceneContext) {
    await ctx.answerCbQuery();
    await ctx.scene.enter('DEPOSIT_WIZARD');
  }

  @Action('change_language')
  async onChangeLanguage(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const from = ctx.callbackQuery?.from;
    if (!from) return;

    let user = await this.usersService.findByTelegramId(from.id);
    if (!user) return;

    const newLang = user.language === 'ar' ? 'en' : 'ar';
    user.language = newLang;
    await user.save(); // Needs to access save, better to abstract if needed but works for mongoose Document

    const t = i18n[newLang as keyof typeof i18n];
    await ctx.reply(t.language_changed);
    // Restart logic to re-render buttons
    await this.onStart(ctx);
  }

  @Action('back_home')
  async onBackHome(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    await this.onStart(ctx);
  }

  @Action(/^s_(.+)$/)
  async onServiceClick(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const serviceId = (ctx as any).match[1];
    const service = await this.servicesService.findById(serviceId);

    if (!service) {
      await ctx.reply('الخدمة غير موجودة أو لم تعد متوفرة. ❌');
      return;
    }

    const msg = `📦 **تفاصيل الخدمة:**\n\n` +
      `🔹 الاسم: ${service.name}\n` +
      `📝 الوصف: ${service.description}\n` +
      `💵 السعر: $${service.price_usd}\n\n` +
      `هل ترغب في شراء هذه الخدمة بخصم الرصيد من محفظتك؟`;

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(`✅ تأكيد الشراء ($${service.price_usd})`, `buy_${service._id.toString()}`)],
        [Markup.button.callback('🔙 رجوع للخدمات', 'view_services')]
      ])
    });
  }

  @Action(/^buy_(.+)$/)
  async onBuyService(@Ctx() ctx: Context) {
    await ctx.answerCbQuery();
    const serviceId = (ctx as any).match[1];

    // In a real flow, better to ask for confirmation or lock transaction
    const from = ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    const service = await this.servicesService.findById(serviceId);

    if (!user || !service) return;

    if (user.wallet_balance < service.price_usd) {
      await ctx.reply(`❌ رصيدك الحالي ($${user.wallet_balance}) غير كافٍ لإتمام عملية الشراء لخدمة بقيمة ($${service.price_usd}).\nيرجى شحن محفظتك أولاً.`, {
        ...Markup.inlineKeyboard([[Markup.button.callback('💵 إيداع', 'deposit'), Markup.button.callback('🔙 رجوع', 'back_home')]])
      });
      return;
    }

    // Process Purchase (Mock logic)
    user.wallet_balance -= service.price_usd;
    await user.save();

    await ctx.reply(`✅ **تمت عملية الشراء بنجاح!**\n\n` +
      `📦 الخدمة: ${service.name}\n` +
      `تفاصيل التسليم:\n` +
      `${service.delivery_details || 'سيتم التواصل معك لتسليم الخدمة.'}\n\n` +
      `رصيدك المتبقي: $${user.wallet_balance}`, { parse_mode: 'Markdown' });
  }
}
