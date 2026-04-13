import { Injectable } from '@nestjs/common';
import { Ctx, Message, On, Wizard, WizardStep } from 'nestjs-telegraf';
import { isMenuButton } from '../i18n';
import { Markup, Scenes } from 'telegraf';
import { ServicesService } from '../../services/services.service';

import { UsersService } from '../../users/users.service';

interface AdminServicesSession extends Scenes.WizardSessionData {
  serviceName?: string;
  serviceDesc?: string;
  servicePrice?: number;
  serviceDelivery?: string;
}

export interface AdminServicesContext extends Scenes.WizardContext<AdminServicesSession> {}

@Injectable()
@Wizard('ADMIN_SERVICES_WIZARD')
export class AdminServicesWizard {
  constructor(
    private readonly servicesService: ServicesService,
    private readonly usersService: UsersService,
  ) {}

  @WizardStep(1)
  async step1(@Ctx() ctx: AdminServicesContext) {
    const fromId = ctx.from?.id;
    if (!fromId) return ctx.scene.leave();
    const user = await this.usersService.findByTelegramId(fromId);
    if (fromId.toString() !== process.env.ADMIN_ID && user?.role !== 'admin') {
      return ctx.scene.leave();
    }

    await ctx.reply(
      '➕ **إضافة خدمة جديدة**\n\n📌 الخطوة 1/4: أرسل اسم الخدمة:\n\nأو أرسل /cancel للإلغاء.',
      { parse_mode: 'Markdown' },
    );
    ctx.wizard.next();
  }

  @WizardStep(2)
  @On('text')
  async step2(@Ctx() ctx: AdminServicesContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || isMenuButton(msg)) {
      await ctx.reply('تم الإلغاء. يرجى اختيار الإجراء من القائمة.');
      return ctx.scene.leave();
    }
    ctx.scene.session.serviceName = msg;
    await ctx.reply(
      `✅ الاسم: **${msg}**\n\n📌 الخطوة 2/4: أرسل وصف الخدمة:`,
      { parse_mode: 'Markdown' },
    );
    ctx.wizard.next();
  }

  @WizardStep(3)
  @On('text')
  async step3(@Ctx() ctx: AdminServicesContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || isMenuButton(msg)) {
      await ctx.reply('تم الإلغاء. يرجى اختيار الإجراء من القائمة.');
      return ctx.scene.leave();
    }
    ctx.scene.session.serviceDesc = msg;
    await ctx.reply(
      `✅ الوصف: ${msg}\n\n📌 الخطوة 3/4: أرسل السعر بالدولار (رقم فقط):`,
      { parse_mode: 'Markdown' },
    );
    ctx.wizard.next();
  }

  @WizardStep(4)
  @On('text')
  async step4(@Ctx() ctx: AdminServicesContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || isMenuButton(msg)) {
      await ctx.reply('تم الإلغاء. يرجى اختيار الإجراء من القائمة.');
      return ctx.scene.leave();
    }
    const price = parseFloat(msg);
    if (isNaN(price) || price <= 0) {
      await ctx.reply('❌ سعر غير صالح. أرسل رقماً صحيحاً.');
      return;
    }
    ctx.scene.session.servicePrice = price;
    await ctx.reply(
      `✅ السعر: $${price}\n\n📌 الخطوة 4/4: أرسل تفاصيل التسليم (ما سيظهر للمشتري بعد الشراء):`,
      { parse_mode: 'Markdown' },
    );
    ctx.wizard.next();
  }

  @WizardStep(5)
  @On('text')
  async step5(@Ctx() ctx: AdminServicesContext, @Message('text') msg: string) {
    if (msg.startsWith('/') || isMenuButton(msg)) {
      await ctx.reply('تم الإلغاء. يرجى اختيار الإجراء من القائمة.');
      return ctx.scene.leave();
    }

    try {
      const service = await this.servicesService.create({
        vendor_id: 'admin',
        name: ctx.scene.session.serviceName || '',
        description: ctx.scene.session.serviceDesc || '',
        price_usd: ctx.scene.session.servicePrice || 0,
        delivery_details: msg,
      });

      await ctx.reply(
        `🎉 **تم إضافة الخدمة بنجاح!**\n\n` +
        `📦 الاسم: ${service.name}\n` +
        `📝 الوصف: ${service.description}\n` +
        `💵 السعر: $${service.price_usd}\n` +
        `📋 التسليم: ${msg}`,
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('➕ إضافة خدمة أخرى', 'admin_add_service')],
            [Markup.button.callback('🔙 لوحة التحكم', 'admin_panel')],
          ]),
        },
      );
    } catch (e) {
      await ctx.reply('❌ حدث خطأ أثناء إضافة الخدمة.');
    }
    ctx.scene.leave();
  }
}
