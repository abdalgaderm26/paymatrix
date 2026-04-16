import { UseGuards } from '@nestjs/common';
import { Start, Update, Ctx, Help, Action, On, Command, Message } from 'nestjs-telegraf';
import { Context, Markup, Scenes } from 'telegraf';
import { UsersService } from '../users/users.service';
import { ServicesService } from '../services/services.service';
import { TransactionsService } from '../transactions/transactions.service';
import { OrdersService } from '../orders/orders.service';
import { SettingsService, DEFAULT_WALLETS } from '../settings/settings.service';
import { i18n, isMenuButton } from './i18n';
import { BanGuard } from './guards/ban.guard';

@Update()
@UseGuards(BanGuard)
export class BotUpdate {
  constructor(
    private readonly usersService: UsersService,
    private readonly servicesService: ServicesService,
    private readonly settingsService: SettingsService,
    private readonly transactionsService: TransactionsService,
    private readonly ordersService: OrdersService,
  ) {}

  async checkIsAdmin(ctx: Context): Promise<boolean> {
    const fromId = ctx.from?.id;
    if (!fromId) return false;
    if (fromId.toString() === process.env.ADMIN_ID) return true;
    const user = await this.usersService.findByTelegramId(fromId);
    return user?.role === 'admin';
  }

  async formatMoney(amount: number): Promise<string> {
    try {
      const rateStr = await this.settingsService.getSetting('EXCHANGE_RATE_SDG');
      const rate = rateStr ? parseFloat(rateStr) : 1970;
      const sdgAmount = Math.round(amount * rate);
      return `$${amount.toLocaleString()} (≈ ${sdgAmount.toLocaleString()} SDG)`;
    } catch {
      return `$${amount.toLocaleString()}`;
    }
  }

  @Start()
  async onStart(@Ctx() ctx: Context) {
    const from = ctx.message?.from || ctx.callbackQuery?.from;
    if (!from) return;

    const user = await this.usersService.findOrCreate(
      from.id,
      from.username || '',
      [from.first_name, from.last_name].filter(Boolean).join(' '),
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
    const isAdmin = await this.checkIsAdmin(ctx);

    const keyboardButtons = [
      [t.btn_services, t.btn_wallet],
      [t.btn_orders, t.btn_deposit],
      [t.btn_referral, t.btn_support],
      [t.btn_language],
    ];

    if (isAdmin) {
      keyboardButtons.push([t.btn_admin_panel]);
    }

    const mainKeyboard = Markup.keyboard(keyboardButtons).resize();

    let botUsername = process.env.BOT_USERNAME || ctx.botInfo?.username;
    if (!botUsername) {
      try {
        const me = await ctx.telegram.getMe();
        botUsername = me.username;
      } catch (e) {
        botUsername = 'PayMatrixBot';
      }
    }

    await ctx.reply(
      t.welcome(user.full_name, await this.formatMoney(user.wallet_balance)) +
        `\n\n🔗 رابط الدعوة الخاص بك لربح المكافآت:\nhttps://t.me/${botUsername}?start=ref_${from.id}`,
      { ...mainKeyboard },
    );
  }

  @On('text')
  async onTextMessage(@Ctx() ctx: Context, @Message('text') text: string) {
    const from = ctx.message?.from;
    if (!from) return;

    let user = await this.usersService.findByTelegramId(from.id);
    if (!user) {
      await this.onStart(ctx as any);
      user = (await this.usersService.findByTelegramId(from.id))!;
      if (!user) return; // Paranoia check
    }
    const lang = user?.language === 'en' ? 'en' : 'ar';
    const t = i18n[lang as keyof typeof i18n];

    if (isMenuButton(text) && (ctx as any).scene) {
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
      return this.onMyOrders(ctx);
    }
    if (text === t.btn_admin_panel || text === i18n.ar.btn_admin_panel || text === i18n.en.btn_admin_panel) {
      return this.onAdminPanel(ctx);
    }
    if (text === t.btn_support || text === i18n.ar.btn_support || text === i18n.en.btn_support) {
      return (ctx as any).scene.enter('SUPPORT_WIZARD');
    }
    if (text === t.btn_referral || text === i18n.ar.btn_referral || text === i18n.en.btn_referral) {
      let botUsername = process.env.BOT_USERNAME || ctx.botInfo?.username;
      if (!botUsername) {
        try {
          const me = await ctx.telegram.getMe();
          botUsername = me.username;
        } catch (e) {
          botUsername = 'PayMatrixBot';
        }
      }
      await ctx.reply(`🔗 رابط الدعوة الخاص بك لربح المكافآت:\nhttps://t.me/${botUsername}?start=ref_${from.id}`);
      return;
    }
  }

  // ======================== ADMIN PANEL ========================
  @Command('admin')
  @Action('admin_panel')
  async onAdminPanel(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!(await this.checkIsAdmin(ctx))) return;

    const stats = await this.usersService.getStats();
    const txStats = await this.transactionsService.getStats();

    await ctx.reply(
      `🛡️ **لوحة التحكم الإدارية:**\n\n` +
      `👥 المستخدمين: ${stats.totalUsers}\n` +
      `💰 إجمالي الأرصدة: $${stats.totalBalance}\n` +
      `📥 إيداعات معلقة: ${txStats.pendingCount}\n` +
      `💵 إجمالي الإيرادات: $${txStats.totalRevenue}\n\n` +
      `اختر القسم الذي تريد إدارته:`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('📥 مراجعة الإيداعات المعلقة', 'admin_review_deposits')],
          [Markup.button.callback('📦 إدارة الخدمات', 'admin_manage_services')],
          [Markup.button.callback('👥 إدارة المستخدمين والأرصدة', 'admin_users_funds')],
          [Markup.button.callback('🧾 إدارة الطلبات', 'admin_manage_orders')],
          [Markup.button.callback('⚙️ إعدادات المحافظ والدفع', 'admin_settings_wallets')],
          [Markup.button.callback('👑 إدارة المشرفين', 'admin_manage_admins')],
          [Markup.button.callback('📢 إرسال جماعي', 'admin_broadcast')],
          [Markup.button.callback('📊 إحصائيات مفصلة', 'admin_detailed_stats')],
        ]),
      },
    );
  }

  // ======================== ADMIN: REVIEW DEPOSITS ========================
  @Action('admin_review_deposits')
  async onReviewDeposits(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const pending = await this.transactionsService.getPendingDeposits();

    if (pending.length === 0) {
      await ctx.reply('✅ لا توجد إيداعات معلقة حالياً.', {
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'admin_panel')]]),
      });
      return;
    }

    for (const tx of pending.slice(0, 5)) {
      const userDoc = tx.user_id as any;
      const userName = userDoc?.full_name || userDoc?.username || 'غير معروف';
      const telegramId = userDoc?.telegram_id || 'N/A';

      let msg =
        `📥 **طلب إيداع معلق**\n\n` +
        `👤 المستخدم: ${userName} (${telegramId})\n` +
        `💵 المبلغ: $${tx.amount}\n` +
        `🏦 الطريقة: ${tx.method || 'غير محددة'}\n` +
        `📅 التاريخ: ${(tx as any).createdAt?.toLocaleDateString?.() || 'N/A'}`;

      if (tx.proof_file_id) {
        try {
          await ctx.replyWithPhoto(tx.proof_file_id, {
            caption: msg,
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ قبول وإضافة الرصيد', `approve_deposit_${tx._id}`)],
              [Markup.button.callback('❌ رفض', `reject_deposit_${tx._id}`)],
              [Markup.button.callback('✉️ مراسلة العميل', `msg_user_${telegramId}`)],
            ]),
          });
        } catch {
          await ctx.reply(msg, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('✅ قبول', `approve_deposit_${tx._id}`)],
              [Markup.button.callback('❌ رفض', `reject_deposit_${tx._id}`)],
              [Markup.button.callback('✉️ مراسلة العميل', `msg_user_${telegramId}`)],
            ]),
          });
        }
      } else {
        await ctx.reply(msg, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ قبول', `approve_deposit_${tx._id}`)],
            [Markup.button.callback('❌ رفض', `reject_deposit_${tx._id}`)],
            [Markup.button.callback('✉️ مراسلة العميل', `msg_user_${telegramId}`)],
          ]),
        });
      }
    }

    if (pending.length > 5) {
      await ctx.reply(`📋 يوجد ${pending.length - 5} طلب إضافي. يرجى المراجعة من لوحة التحكم الويب.`);
    }
  }

  @Action(/^approve_deposit_(.+)$/)
  async onApproveDeposit(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const txId = (ctx as any).match[1];
    const tx = await this.transactionsService.findById(txId);
    if (!tx) {
      await ctx.reply('❌ المعاملة غير موجودة.');
      return;
    }

    // SECURITY: Prevent double approval
    if (tx.status !== 'pending') {
      await ctx.reply(`⚠️ هذه المعاملة تم معالجتها مسبقاً (${tx.status}).`);
      return;
    }

    // Mark as approved FIRST to prevent race condition
    await this.transactionsService.updateStatus(txId, 'approved');

    const userDoc = tx.user_id as any;
    const telegramId = userDoc?.telegram_id;

    if (telegramId) {
      await this.usersService.updateBalance(telegramId, tx.amount, 'add');
      try {
        const formatted = await this.formatMoney(tx.amount);
        await (ctx as any).telegram.sendMessage(
          telegramId,
          `🎉 **تمت الموافقة على إيداعك!**\n\nتم إضافة ${formatted} إلى رصيدك بنجاح.`,
          { parse_mode: 'Markdown' },
        );
      } catch {}
    }

    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {}
    await ctx.reply(`✅ تمت الموافقة على الإيداع وإضافة $${tx.amount} لرصيد المستخدم.`);
  }

  @Action(/^reject_deposit_(.+)$/)
  async onRejectDeposit(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const txId = (ctx as any).match[1];
    const tx = await this.transactionsService.findById(txId);
    if (!tx) return;

    // SECURITY: Prevent double rejection
    if (tx.status !== 'pending') {
      await ctx.reply(`⚠️ هذه المعاملة تم معالجتها مسبقاً (${tx.status}).`);
      return;
    }

    await this.transactionsService.updateStatus(txId, 'rejected');

    const userDoc = tx.user_id as any;
    const telegramId = userDoc?.telegram_id;

    if (telegramId) {
      try {
        await (ctx as any).telegram.sendMessage(
          telegramId,
          '❌ عذراً، تم رفض طلب الإيداع الخاص بك. يرجى التأكد من صحة البيانات والمحاولة مرة أخرى.',
          { parse_mode: 'Markdown' },
        );
      } catch {}
    }

    try {
      await ctx.editMessageReplyMarkup(undefined);
    } catch {}
    await ctx.reply('❌ تم رفض الإيداع والتعديل على الحالة.');
  }

  // ======================== ADMIN: SERVICES MANAGEMENT ========================
  @Action('admin_manage_services')
  async onManageServices(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const { services } = await this.servicesService.findAll(1, 20);
    if (services.length === 0) {
      await ctx.reply('📦 لا توجد خدمات حالياً.', {
        ...Markup.inlineKeyboard([
          [Markup.button.callback('➕ إضافة خدمة', 'admin_add_service')],
          [Markup.button.callback('🔙 رجوع', 'admin_panel')],
        ]),
      });
      return;
    }

    const buttons = services.map((s) => {
      const status = s.is_active ? '🟢' : '🔴';
      return [Markup.button.callback(`${status} ${s.name} - $${s.price_usd}`, `admin_svc_${s._id}`)];
    });
    buttons.push([Markup.button.callback('➕ إضافة خدمة جديدة', 'admin_add_service')]);
    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_panel')]);

    await ctx.reply('📦 **قائمة الخدمات:**\n🟢 = مفعّلة | 🔴 = معطّلة\n\nاضغط على خدمة لإدارتها:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action('admin_add_service')
  async onAdminAddService(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    await ctx.scene.enter('ADMIN_ADD_SERVICE_WIZARD');
  }

  @Action(/^admin_svc_(.+)$/)
  async onServiceDetail(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const serviceId = (ctx as any).match[1];
    const service = await this.servicesService.findById(serviceId);
    if (!service) {
      await ctx.reply('❌ الخدمة غير موجودة.');
      return;
    }

    const status = service.is_active ? '🟢 مفعّلة' : '🔴 معطّلة';
    const toggleText = service.is_active ? '🔴 تعطيل الخدمة' : '🟢 تفعيل الخدمة';

    const text = `📦 **تفاصيل الخدمة:**\n\n` +
      `📛 الاسم: ${service.name}\n` +
      `📝 الوصف: ${service.description || 'بدون وصف'}\n` +
      `💵 السعر: $${service.price_usd}\n` +
      `📋 التسليم: ${service.delivery_details || 'غير محدد'}\n` +
      `📊 الحالة: ${status}`;

    const buttons = [
      [Markup.button.callback('✏️ تعديل الاسم', `edit_svc_name_${serviceId}`),
       Markup.button.callback('💵 تعديل السعر', `edit_svc_price_${serviceId}`)],
      [Markup.button.callback('📝 تعديل الوصف', `edit_svc_desc_${serviceId}`),
       Markup.button.callback('📋 تعديل التسليم', `edit_svc_delivery_${serviceId}`)],
      [Markup.button.callback(toggleText, `toggle_svc_${serviceId}`)],
      [Markup.button.callback('🗑️ حذف الخدمة', `confirm_del_svc_${serviceId}`)],
      [Markup.button.callback('🔙 رجوع للقائمة', 'admin_manage_services')],
    ];

    try {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    } catch {
      await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    }
  }

  @Action(/^toggle_svc_(.+)$/)
  async onToggleService(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const serviceId = (ctx as any).match[1];
    const service = await this.servicesService.toggleActive(serviceId);
    if (service) {
      // Auto-refresh: re-render the detail view
      (ctx as any).match = [null, serviceId];
      await this.onServiceDetail(ctx);
    }
  }

  @Action(/^confirm_del_svc_(.+)$/)
  async onConfirmDeleteService(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const serviceId = (ctx as any).match[1];
    const service = await this.servicesService.findById(serviceId);
    if (!service) return;
    try {
      await ctx.editMessageText(
        `⚠️ **هل أنت متأكد من حذف خدمة "${service.name}"؟**\n\nهذا الإجراء لا يمكن التراجع عنه.`,
        { parse_mode: 'Markdown', ...Markup.inlineKeyboard([
          [Markup.button.callback('✅ نعم، احذف', `delete_svc_${serviceId}`)],
          [Markup.button.callback('❌ إلغاء', `admin_svc_${serviceId}`)],
        ])}
      );
    } catch {}
  }

  @Action(/^delete_svc_(.+)$/)
  async onDeleteService(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const serviceId = (ctx as any).match[1];
    const deleted = await this.servicesService.delete(serviceId);
    if (deleted) {
      try { await ctx.editMessageText('🗑️ تم حذف الخدمة بنجاح.'); } catch {}
      // Auto-refresh: show services list
      await this.onManageServices(ctx);
    } else {
      await ctx.reply('❌ الخدمة غير موجودة.');
    }
  }

  // Service edit handlers - enter wizard with field to edit
  @Action(/^edit_svc_(name|price|desc|delivery)_(.+)$/)
  async onEditServiceField(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const field = (ctx as any).match[1];
    const serviceId = (ctx as any).match[2];
    const fieldLabels: Record<string, string> = { name: 'اسم الخدمة', price: 'السعر', desc: 'الوصف', delivery: 'تفاصيل التسليم' };
    const fieldHints: Record<string, string> = { name: 'أرسل الاسم الجديد:', price: 'أرسل السعر الجديد بالدولار (رقم فقط):', desc: 'أرسل الوصف الجديد:', delivery: 'أرسل تفاصيل التسليم الجديدة:' };
    await ctx.reply(`✏️ **تعديل ${fieldLabels[field]}:**\n\n${fieldHints[field]}\n\nأو أرسل /cancel للإلغاء.`, { parse_mode: 'Markdown' });
    await ctx.scene.enter('ADMIN_EDIT_SERVICE_WIZARD', { serviceId, field });
  }

  // ======================== ADMIN: MANAGE ORDERS ========================
  @Action('admin_manage_orders')
  async onManageOrders(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const { orders } = await this.ordersService.findAll(1, 10, { status: 'approved' });
    const pendingOrders = await this.ordersService.findAll(1, 10, { status: 'pending' });

    if (orders.length === 0 && pendingOrders.orders.length === 0) {
      await ctx.reply('📋 لا توجد طلبات حالياً.', {
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'admin_panel')]]),
      });
      return;
    }

    const allOrders = [...pendingOrders.orders, ...orders].slice(0, 10);
    let msg = '🧾 **آخر الطلبات:**\n\n';
    for (const order of allOrders) {
      const svc = order.service_id as any;
      const usr = order.user_id as any;
      const statusMap: Record<string, string> = {
        pending: '⏳', approved: '✅', rejected: '❌',
        waiting_payment: '💳', paid: '💰',
      };
      msg += `${statusMap[order.status] || '📦'} ${svc?.name || 'خدمة'} - $${order.price_usd} | ${usr?.full_name || 'مستخدم'}\n`;
    }

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'admin_panel')]]),
    });
  }

  // ======================== ADMIN: MANAGE ADMINS ========================
  @Action('admin_manage_admins')
  async onManageAdmins(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    // Only main admin can manage other admins
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) {
      await ctx.reply('⛔ هذه الصلاحية متاحة فقط للمشرف الرئيسي.');
      return;
    }

    const admins = await this.usersService.getAdmins();
    let msg = '👑 **إدارة المشرفين:**\n\n';
    msg += `👤 المشرف الرئيسي: ID \`${process.env.ADMIN_ID}\`\n\n`;
    
    if (admins.length > 0) {
      msg += '👥 **المشرفون الفرعيون:**\n';
      for (const admin of admins) {
        if (admin.telegram_id.toString() === process.env.ADMIN_ID) continue;
        msg += `├ ${admin.full_name} (\`${admin.telegram_id}\`)\n`;
      }
    } else {
      msg += '📭 لا يوجد مشرفون فرعيون حالياً.\n';
    }

    msg += '\nلإضافة مشرف جديد أو إزالته، اختر من الأسفل:';

    const buttons = admins
      .filter(a => a.telegram_id.toString() !== process.env.ADMIN_ID)
      .map(a => [Markup.button.callback(`🗑️ إزالة ${a.full_name}`, `admin_demote_${a.telegram_id}`)]);

    buttons.push([Markup.button.callback('➕ ترقية مستخدم لمشرف', 'admin_promote_user')]);
    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_panel')]);

    await ctx.reply(msg, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action('admin_promote_user')
  async onPromoteUser(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return;
    // Reuse search wizard to find user, then promote
    await ctx.reply('🔍 أرسل اسم أو ID المستخدم الذي تريد ترقيته لمشرف:');
    await ctx.scene.enter('ADMIN_USERS_WIZARD', { searchMode: true, promoteMode: true });
  }

  @Action(/^admin_demote_(\d+)$/)
  async onDemoteAdmin(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return;
    const tId = parseInt((ctx as any).match[1]);
    const user = await this.usersService.updateRole(tId, 'user');
    if (user) {
      await ctx.reply(`✅ تم إزالة صلاحيات المشرف من ${user.full_name}.`);
      // Send updated keyboard to demoted user (without admin button)
      try {
        const t = i18n[(user.language as keyof typeof i18n) || 'ar'];
        const keyboard = Markup.keyboard([
          [t.btn_services, t.btn_wallet],
          [t.btn_orders, t.btn_deposit],
          [t.btn_referral, t.btn_support],
          [t.btn_language],
        ]).resize();
        await (ctx as any).telegram.sendMessage(tId, '⚠️ تم تحديث صلاحياتك من قبل الإدارة.', { ...keyboard });
      } catch {}
      // Auto-refresh: re-render admins list
      await this.onManageAdmins(ctx);
    } else {
      await ctx.reply('❌ المستخدم غير موجود.');
    }
  }

  @Action(/^admin_do_promote_(\d+)$/)
  async onDoPromote(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (ctx.from?.id.toString() !== process.env.ADMIN_ID) return;
    const tId = parseInt((ctx as any).match[1]);
    const user = await this.usersService.updateRole(tId, 'admin');
    if (user) {
      await ctx.reply(`✅ تم ترقية **${user.full_name}** لمشرف بنجاح!`, { parse_mode: 'Markdown' });
      // Send updated keyboard WITH admin button to promoted user
      try {
        const t = i18n[(user.language as keyof typeof i18n) || 'ar'];
        const keyboard = Markup.keyboard([
          [t.btn_services, t.btn_wallet],
          [t.btn_orders, t.btn_deposit],
          [t.btn_referral, t.btn_support],
          [t.btn_language],
          [t.btn_admin_panel],
        ]).resize();
        await (ctx as any).telegram.sendMessage(tId, '👑 **مبروك!** تمت ترقيتك كمشرف في المنصة. يمكنك الآن الوصول لأدوات الإدارة من الأسفل.', { parse_mode: 'Markdown', ...keyboard });
      } catch {}
      // Auto-refresh: re-render admins list
      await this.onManageAdmins(ctx);
    } else {
      await ctx.reply('❌ المستخدم غير موجود.');
    }
  }

  // ======================== ADMIN: BROADCAST ========================
  @Action('admin_broadcast')
  async onBroadcast(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    await ctx.scene.enter('ADMIN_BROADCAST_WIZARD');
  }

  // ======================== ADMIN: DETAILED STATS ========================
  @Action('admin_detailed_stats')
  async onDetailedStats(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const [userStats, txStats, orderStats, serviceStats] = await Promise.all([
      this.usersService.getStats(),
      this.transactionsService.getStats(),
      this.ordersService.getStats(),
      this.servicesService.getStats(),
    ]);

    await ctx.reply(
      `📊 **إحصائيات مفصلة:**\n\n` +
      `👥 **المستخدمين:**\n` +
      `   ├ الإجمالي: ${userStats.totalUsers}\n` +
      `   ├ المحظورين: ${userStats.bannedUsers}\n` +
      `   ├ نشطون اليوم: ${userStats.activeToday}\n` +
      `   └ إجمالي الأرصدة: $${userStats.totalBalance}\n\n` +
      `💰 **المعاملات:**\n` +
      `   ├ إيداعات مقبولة: $${txStats.totalDeposits}\n` +
      `   ├ مدفوعات: $${txStats.totalPayments}\n` +
      `   └ معلقة: ${txStats.pendingCount}\n\n` +
      `📦 **الطلبات:**\n` +
      `   ├ الإجمالي: ${orderStats.totalOrders}\n` +
      `   ├ معلقة: ${orderStats.pendingOrders}\n` +
      `   ├ مكتملة: ${orderStats.completedOrders}\n` +
      `   └ إجمالي المبيعات: $${orderStats.totalSales}\n\n` +
      `🛒 **الخدمات:**\n` +
      `   ├ الإجمالي: ${serviceStats.total}\n` +
      `   ├ مفعّلة: ${serviceStats.active}\n` +
      `   └ معطّلة: ${serviceStats.inactive}`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([[Markup.button.callback('🔙 رجوع', 'admin_panel')]]),
      },
    );
  }

  // ======================== ADMIN: WALLETS / USERS / BAN ========================
  @Action('admin_settings_wallets')
  async onAdminSettingsWallets(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;

    const wallets = await this.settingsService.getAllDepositMethods();
    const buttons = DEFAULT_WALLETS.map((def) => {
      const w = wallets.find((x) => x.key === def.key);
      const val = w ? (w.value.length > 15 ? w.value.substring(0, 15) + '...' : w.value) : 'غير محدد';
      return [Markup.button.callback(`📝 ${def.label} (${val})`, `edit_wallet_${def.key}`)];
    });

    const sdgRate = await this.settingsService.getSetting('EXCHANGE_RATE_SDG') || 'غير محدد';
    buttons.push([Markup.button.callback(`💱 سعر الصرف SDG (${sdgRate})`, `edit_wallet_EXCHANGE_RATE_SDG`)]);
    
    buttons.push([Markup.button.callback('➕ إضافة بنك أو محفظة جديدة', 'admin_add_wallet')]);
    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_panel')]);

    await ctx.reply('⚙️ **إعدادات المحافظ وبوابات الدفع:**\nاضغط على المحفظة لتعديلها:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  @Action(/^edit_wallet_(.+)$/)
  async onEditWallet(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const walletKey = (ctx as any).match[1];
    await ctx.scene.enter('ADMIN_SETTINGS_WIZARD', { walletKey });
  }

  @Action('admin_add_wallet')
  async onAdminAddWallet(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    await ctx.scene.enter('ADMIN_ADD_WALLET_WIZARD');
  }

  @Action('admin_users_funds')
  async onAdminUsersFunds(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    return this.renderUsersPage(ctx, 1, false);
  }

  @Action(/^admin_users_page_(\d+)$/)
  async onAdminUsersPage(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const page = parseInt((ctx as any).match[1]);
    return this.renderUsersPage(ctx, page, true);
  }

  async renderUsersPage(ctx: Scenes.SceneContext, page: number, isEdit: boolean) {
    const { users, pages } = await this.usersService.findAll(page, 7);
    const buttons = users.map(u => [
       Markup.button.callback(`👤 ${u.full_name} | $${u.wallet_balance}`, `admin_u_opts_${u.telegram_id}`)
    ]);

    const nav = [];
    if (page > 1) nav.push(Markup.button.callback('⬅️ السابق', `admin_users_page_${page - 1}`));
    if (page < pages) nav.push(Markup.button.callback('التالي ➡️', `admin_users_page_${page + 1}`));
    if (nav.length) buttons.push(nav);

    buttons.push([Markup.button.callback('🔍 بحث بالاسم/الآيدي', 'admin_search_users')]);
    buttons.push([Markup.button.callback('🔙 رجوع', 'admin_panel')]);

    const text = `👥 **إدارة المستخدمين**\nصفحة ${page} من ${pages}:\nاختر مستخدماً لعرض الخيارات:`;
    if (isEdit && ctx.callbackQuery) {
      await ctx.editMessageText(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    } else {
      await ctx.reply(text, { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) });
    }
  }

  @Action(/^admin_u_opts_(\d+)$/)
  async onAdminUserOpts(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const tId = parseInt((ctx as any).match[1]);
    const user = await this.usersService.findByTelegramId(tId);
    if (!user) {
      await ctx.reply('❌ المستخدم غير موجود.');
      return;
    }

    const buttons = [
      [Markup.button.callback('➕ إضافة رصيد', `u_add_${tId}`), Markup.button.callback('➖ خصم', `u_deduct_${tId}`)],
      [Markup.button.callback(user.is_banned ? 'فك الحظر ✅' : 'حظر 🚫', `u_ban_${tId}`)],
      [Markup.button.callback('✉️ مراسلة العميل', `msg_user_${tId}`)],
      [Markup.button.callback('🔙 عودة للقائمة', 'admin_users_funds')]
    ];

    await ctx.editMessageText(
      `👤 **${user.full_name}**\n` +
      `📌 ID: \`${user.telegram_id}\`\n` +
      `💰 الرصيد الحالي: ${await this.formatMoney(user.wallet_balance)}\n` +
      `🛑 الحالة: ${user.is_banned ? 'محظور' : 'نشط'}\n\n` +
      `ما العمليات التي تود تنفيذها؟`,
      { parse_mode: 'Markdown', ...Markup.inlineKeyboard(buttons) }
    );
  }

  @Action(/^u_ban_(\d+)$/)
  async onAdminBanUserToggle(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const tId = parseInt((ctx as any).match[1]);
    const user = await this.usersService.findByTelegramId(tId);
    if (user) {
      user.is_banned = !user.is_banned;
      await user.save();
      // Auto-refresh: re-render user detail with updated ban status
      (ctx as any).match = [null, tId.toString()];
      await this.onAdminUserOpts(ctx);
    }
  }

  @Action(/^msg_user_(\d+)$/)
  async onAdminMsgUser(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const tId = (ctx as any).match[1];
    await ctx.scene.enter('ADMIN_MESSAGE_USER_WIZARD', { telegramId: tId });
  }

  @Action(/^u_(add|deduct)_(\d+)$/)
  async onAdminUFundsDirect(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    const match = (ctx as any).match;
    const op = match[1].toUpperCase();
    const tId = parseInt(match[2]);
    await ctx.scene.enter('ADMIN_USERS_WIZARD', { targetUserId: tId, operation: op });
  }

  @Action('admin_search_users')
  async onAdminSearchUsers(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    if (!await this.checkIsAdmin(ctx)) return;
    await ctx.scene.enter('ADMIN_USERS_WIZARD', { searchMode: true });
  }


  // ======================== USER: SERVICES ========================
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

    const buttons = services.map((s) => [
      Markup.button.callback(`🔹 ${s.name} - $${s.price_usd}`, `s_${s._id.toString()}`),
    ]);

    await ctx.reply('🛒 **الخدمات المتوفرة حالياً:**\nاختر خدمة لمعرفة المزيد:', {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard(buttons),
    });
  }

  // ======================== USER: WALLET ========================
  @Action('view_wallet')
  async onWalletAction(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    if (!user) return;
    const t = i18n[user.language as keyof typeof i18n] || i18n.ar;

    const txs = await this.transactionsService.findByUser(user._id as any);
    let historyText = '';
    if (txs.length > 0) {
      historyText = '\n\n📜 **آخر العمليات:**\n';
      for (const tx of txs.slice(0, 5)) {
        const icon = tx.type === 'deposit' ? '📥' : tx.type === 'payment' ? '📤' : '💵';
        const statusIcon = tx.status === 'approved' ? '✅' : tx.status === 'rejected' ? '❌' : '⏳';
        historyText += `${icon} ${tx.type} - $${tx.amount} ${statusIcon}\n`;
      }
    }

    await ctx.reply(t.wallet_info(await this.formatMoney(user.wallet_balance)) + historyText, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback(t.btn_deposit, 'deposit')]]),
    });
  }

  // ======================== USER: DEPOSIT ========================
  @Action('deposit')
  async onDepositAction(@Ctx() ctx: Scenes.SceneContext) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    await ctx.scene.enter('DEPOSIT_WIZARD');
  }

  // ======================== USER: MY ORDERS ========================
  async onMyOrders(@Ctx() ctx: Context) {
    const from = ctx.from;
    if (!from) return;

    const user = await this.usersService.findByTelegramId(from.id);
    if (!user) return;

    const orders = await this.ordersService.findByUser(user._id as any);

    if (orders.length === 0) {
      await ctx.reply('🧾 **طلباتي:**\n\nلا توجد طلبات حالياً. تصفح الخدمات لبدء الشراء!', {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback('🛒 تصفح الخدمات', 'view_services')],
        ]),
      });
      return;
    }

    let msg = '🧾 **طلباتي:**\n\n';
    for (const order of orders.slice(0, 10)) {
      const svc = order.service_id as any;
      const statusMap: Record<string, string> = {
        pending: '⏳ معلق',
        waiting_payment: '💳 بانتظار الدفع',
        paid: '💰 مدفوع',
        approved: '✅ مكتمل',
        rejected: '❌ مرفوض',
      };
      msg += `📦 ${svc?.name || 'خدمة'} - $${order.price_usd} - ${statusMap[order.status] || order.status}\n`;
    }

    await ctx.reply(msg, { parse_mode: 'Markdown' });
  }

  // ======================== USER: LANGUAGE ========================
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

  // ======================== USER: BUY SERVICE ========================
  @Action(/^s_(.+)$/)
  async onServiceClick(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const serviceId = (ctx as any).match[1];
    const service = await this.servicesService.findById(serviceId);

    if (!service) {
      await ctx.reply('الخدمة غير موجودة أو لم تعد متوفرة. ❌');
      return;
    }

    const formattedPrice = await this.formatMoney(service.price_usd);
    await ctx.editMessageText(
      `📦 **تفاصيل الخدمة:**\n\n` +
      `📛 الاسم: ${service.name}\n` +
      `📝 الوصف: ${service.description}\n` +
      `💵 السعر: ${formattedPrice}\n\n` +
      `هل ترغب في شراء هذه الخدمة بخصم الرصيد من محفظتك؟`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`✅ تأكيد الشراء (${formattedPrice})`, `buy_${service._id.toString()}`)],
          [Markup.button.callback('🔙 إلغاء والرجوع', 'view_services')],

        ]),
      },
    );
  }

  @Action(/^buy_(.+)$/)
  async onBuyService(@Ctx() ctx: Context) {
    if (ctx.callbackQuery) await ctx.answerCbQuery();
    const serviceId = (ctx as any).match[1];
    const from = ctx.from;
    if (!from) return;

    // SECURITY: Re-fetch user to get fresh balance (prevents race condition)
    const user = await this.usersService.findByTelegramId(from.id);
    const service = await this.servicesService.findById(serviceId);
    if (!user || !service) return;

    if (!service.is_active) {
      await ctx.reply('❌ هذه الخدمة غير متاحة حالياً.');
      return;
    }

    // SECURITY: Purchase cooldown - prevent rapid buying
    const recentOrders = await this.ordersService.findByUser(user._id as any);
    if (recentOrders.length > 0) {
      const lastOrder = recentOrders[0] as any;
      const timeDiff = Date.now() - new Date(lastOrder.createdAt).getTime();
      if (timeDiff < 10000) { // 10 seconds cooldown
        await ctx.reply('⏳ يرجى الانتظار قليلاً قبل إجراء عملية شراء جديدة.');
        return;
      }
    }

    if (user.wallet_balance < service.price_usd) {
      await ctx.reply(
        `❌ رصيدك الحالي ($${user.wallet_balance}) غير كافٍ لشراء خدمة بقيمة ($${service.price_usd}).\nيرجى شحن محفظتك أولاً.`,
        { ...Markup.inlineKeyboard([[Markup.button.callback('💵 توجيهي لصفحة الإيداع', 'deposit')]]) },
      );
      return;
    }

    // SECURITY: Atomic deduct - deduct first, then create order
    const updatedUser = await this.usersService.updateBalance(from.id, service.price_usd, 'deduct');
    if (!updatedUser) {
      await ctx.reply('❌ حدث خطأ أثناء معالجة الطلب. يرجى المحاولة مرة أخرى.');
      return;
    }

    // Create order
    await this.ordersService.create({
      user_id: user._id as any,
      service_id: service._id as any,
      price_usd: service.price_usd,
      final_price: service.price_usd,
      status: 'approved',
    });

    // Create transaction record
    await this.transactionsService.create({
      user_id: user._id as any,
      type: 'payment',
      amount: service.price_usd,
      method: 'wallet',
      status: 'approved',
    });

    // Notify ALL admins about new purchase
    try {
      const admins = await this.usersService.getAdmins();
      const adminIds = new Set(admins.map(a => a.telegram_id.toString()));
      if (process.env.ADMIN_ID) adminIds.add(process.env.ADMIN_ID);
      for (const aId of adminIds) {
        try {
          await (ctx as any).telegram.sendMessage(
            aId,
            `🛒 **طلب شراء جديد!**\n\n👤 ${user.full_name} (@${user.username || 'N/A'})\n📦 ${service.name}\n💵 $${service.price_usd}`,
            { parse_mode: 'Markdown', ...Markup.inlineKeyboard([[Markup.button.callback('✉️ مراسلة العميل', `msg_user_${from.id}`)]]) },
          );
        } catch {}
      }
    } catch {}

    await ctx.reply(
      `✅ **تمت عملية الشراء بنجاح!**\n\n` +
      `📦 الخدمة: ${service.name}\n` +
      `تفاصيل التسليم:\n` +
      `${service.delivery_details || 'سيتم التواصل معك لتسليم الخدمة قريبًا.'}\n\n` +
      `رصيدك المتبقي: ${await this.formatMoney(updatedUser.wallet_balance)}`,
      { parse_mode: 'Markdown' },
    );
  }

  @Help()
  async onHelp(@Ctx() ctx: Context) {
    await ctx.reply('مرحباً بك في نظام المساعدة. يرجى التفاعل مع البوت باستخدام الأزرار.');
  }
}
