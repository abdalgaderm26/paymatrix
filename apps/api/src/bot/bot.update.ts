import { UseGuards } from '@nestjs/common';
import { Start, Update, Ctx, Help, Action, On, Command, Message } from 'nestjs-telegraf';
import { Context, Markup, Scenes } from 'telegraf';
import { UsersService } from '../users/users.service';
import { ServicesService } from '../services/services.service';
import { SettingsService, DEFAULT_WALLETS } from '../settings/settings.service';
import { i18n } from './i18n';
import { BanGuard } from './guards/ban.guard';

@Update()
@UseGuards(BanGuard)
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly servicesService: ServicesService,
    private readonly settingsService: SettingsService
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.message?.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.usersService.findOrCreate(
      from.id,
      from.username || '',
      [from.first_name, from.last_name].filter(Boolean).join(' ')
    );

    if (ctx.message && 'text' in ctx.message) {
      const text = ctx.message.text;
      if (text.startsWith('/start ref_')) {
        const referredBy = parseInt(text.split('_')[1]);
        if (!isNaN(referredBy) && referredBy !== from.id) {
           if (!user.referred_by && user.createdAt === user.updatedAt) {
              user.referred_by = referredBy;
              await user.save();
           }
        }
      }
    }

    const t = i18n[user.language as keyof typeof i18n] || i18n.ar;
    const isAdmin = from.id.toString() === process.env.ADMIN_ID;
    
    const mainKeyboard = Markup.keyboard([
      [t.btn_services, t.btn_wallet],
      [t.btn_orders, t.btn_deposit],
      [t.btn_support, t.btn_language]
    ]).resize();

    await ctx.reply(t.welcome(user.full_name, user.wallet_balance) + `\n\n🔗 رابط الدعوة الخاص بك لربح المكافآت:\nhttps://t.me/PayMatrixBot?start=ref_${from.id}`, {
      ...mainKeyboard
    });

    if (isAdmin) {
      await ctx.reply('🛡️ خيارات الإدارة:', {
        ...Markup.inlineKeyboard([[Markup.button.callback('🛡️ فتح لوحة تحكم الإدارة', 'admin_panel')]])
      });
    }
  }

  @On('text')
  async onTextMessage(@Ctx() ctx: Context, @Message('text') text: string) {
    const from = ctx.message?.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    const lang = user?.language === 'en' ? 'en' : 'ar';
    const t = i18n[lang as keyof typeof i18n];

    const isMenuButton = [
      t.btn_services, t.btn_wallet, t.btn_orders, t.btn_deposit, t.btn_support, t.btn_language,
      i18n.ar.btn_services, i18n.en.btn_services, i18n.ar.btn_wallet, i18n.en.btn_wallet
    ].includes(text);

    if (isMenuButton && (ctx as any).scene) {
      await (ctx as any).scene.leave();
    }

    if (text === t.btn_services || text === i18n.ar.btn_services || text === i18n.en.btn_services) {
        return this.onServicesAction(ctx);
    }
    if (text === t.btn_wallet || text === i18n.ar.btn_wallet || text === i18n.en.btn_wallet) {
        return this.onWalletAction(ctx);
    }
    if (text === t.btn_deposit || text === i18n.ar.btn_deposit || text === i18n.en.btn_deposit) {
        return this.onDepositAction(ctx as Scenes.SceneContext);
    }
    if (text === t.btn_language || text === i18n.ar.btn_language || text === i18n.en.btn_language) {
        return this.onChangeLanguage(ctx);
    }
    if (text === t.btn_orders || text === i18n.ar.btn_orders || text === i18n.en.btn_orders) {
        await ctx.reply('🧾 طلباتي: هذه الميزة قيد الإعداد قريباً.');
        return;
    }
    if (text === t.btn_support || text === i18n.ar.btn_support || text === i18n.en.btn_support) {
        await ctx.reply('🎧 الدعم الفني: أرسل استفسارك وسيقوم أحد ممثلي الدعم بالرد قريباً.');
        return;
    }
  }

  @Command('admin')
  @Action('admin_panel')
  async onAdminPanel(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    
    const from = ctx.from;
    if (!from || from.id.toString() !== process.env.ADMIN_ID) return;

    await ctx.reply('🛡️ **لوحة التحكم الإدارية:**\nاختر القسم الذي تريد إدارته:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
         [Markup.button.callback('⚙️ إعدادات المحافظ والدفع', 'admin_settings_wallets')],
         [Markup.button.callback('👥 إدارة المستخدمين والأرصدة', 'admin_users_funds')],
         [Markup.button.callback('🚫 حظر مستخدم', 'admin_ban_user')]
      ])
    });
  }

  @Action('admin_settings_wallets')
  async onAdminSettingsWallets(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from || from.id.toString() !== process.env.ADMIN_ID) return;

    const wallets = await this.settingsService.getAllDepositMethods();
    
    const buttons = DEFAULT_WALLETS.map(def => {
       const w = wallets.find(x => x.key === def.key);
       const val = w ? (w.value.length > 15 ? w.value.substring(0, 15) + '...' : w.value) : 'غير محدد';
       return [Markup.button.callback(`📝 ${def.label} (${val})`, `edit_wallet_${def.key}`)];
    });

    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_panel')]);

    await ctx.reply('⚙️ **إعدادات المحافظ وبوابات الدفع:**\nاضغط على المحفظة لتعديل رقم الحساب/العنوان الحالي الخاص بها:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  @Action(/^edit_wallet_(.+)$/)
  async onEditWallet(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from || from.id.toString() !== process.env.ADMIN_ID) return;

    const walletKey = (ctx as any).match[1];
    await ctx.scene.enter('ADMIN_SETTINGS_WIZARD', { walletKey });
  }

  @Action('admin_users_funds')
  async onAdminUsersFunds(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from || from.id.toString() !== process.env.ADMIN_ID) return;

    await ctx.scene.enter('ADMIN_USERS_WIZARD');
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply('مرحباً بك في نظام المساعدة. يرجى التفاعل مع البوت باستخدام الأزرار.');
  }

  @Action('view_services')
  async onServicesAction(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from) return;
    const user = await this.usersService.findByTelegramId(from.id);
    const t = i18n[(user?.language as keyof typeof i18n) || 'ar'];
    
    const services = await this.servicesService.findAllActive();
    
    if (services.length === 0) {
      await ctx.reply(t.services_wip);
      return;
    }

    const buttons = services.map(s => [Markup.button.callback(`🔹 ${s.name} - $${s.price_usd}`, `s_${s._id.toString()}`)]);

    await ctx.reply('🛒 **الخدمات المتوفرة حالياً:**\nاختر خدمة لمعرفة المزيد:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons)
    });
  }

  @Action('view_wallet')
  async onWalletAction(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    if (!user) return;
    const t = i18n[user.language as keyof typeof i18n] || i18n.ar;

    await ctx.reply(t.wallet_info(user.wallet_balance), {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([
        [Markup.button.callback(t.btn_deposit, 'deposit')]
      ])
    });
  }

  @Action('deposit')
  async onDepositAction(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    await ctx.scene.enter('DEPOSIT_WIZARD');
  }

  @Action('change_language')
  async onChangeLanguage(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from) return;

    let user = await this.usersService.findByTelegramId(from.id);
    if (!user) return;

    const newLang = user.language === 'ar' ? 'en' : 'ar';
    user.language = newLang;
    await user.save();

    const t = i18n[newLang as keyof typeof i18n];
    await ctx.reply(t.language_changed);
    await this.onStart(ctx);
  }

  @Action('back_home')
  async onBackHome(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    await this.onStart(ctx);
  }

  @Action(/^s_(.+)$/)
  async onServiceClick(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
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
        [Markup.button.callback('🔙 إلغاء والرجوع', 'view_services')]
      ])
    });
  }

  @Action(/^buy_(.+)$/)
  async onBuyService(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const serviceId = (ctx as any).match[1];
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    const service = await this.servicesService.findById(serviceId);

    if (!user || !service) return;

    if (user.wallet_balance < service.price_usd) {
      await ctx.reply(`❌ رصيدك الحالي ($${user.wallet_balance}) غير كافٍ لإتمام عملية الشراء لخدمة بقيمة ($${service.price_usd}).\nيرجى شحن محفظتك أولاً.`, {
        ...Markup.inlineKeyboard([[Markup.button.callback('💵 توجيهي لصفحة الإيداع', 'deposit')]])
      });
      return;
    }

    user.wallet_balance -= service.price_usd;
    await user.save();

    await ctx.reply(`✅ **تمت عملية الشراء بنجاح!**\n\n` +
      `📦 الخدمة: ${service.name}\n` +
      `تفاصيل التسليم:\n` +
      `${service.delivery_details || 'سيتم التواصل معك لتسليم الخدمة قريبًا.'}\n\n` +
      `رصيدك المتبقي: $${user.wallet_balance}`, { parse_mode: 'Markdown' });
  }
}
