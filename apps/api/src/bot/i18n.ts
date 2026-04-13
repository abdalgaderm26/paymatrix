export const i18n = {
  ar: {
    welcome: (name: string, balance: string) => `مرحباً بك في PayMatrix Bot! 🚀\nالمنصة الأقوى للخدمات الرقمية.\n\n👤 اسمك: ${name}\n💰 رصيدك: ${balance}\n\nيرجى اختيار أحد الخيارات أدناه للحصول على خدماتنا:`,
    btn_services: '🛒 تصفح الخدمات',
    btn_wallet: '💼 محفظتي',
    btn_orders: '🧾 طلباتي',
    btn_support: '🎧 الدعم الفني',
    btn_language: '🌐 تغيير اللغة (EN)',
    btn_referral: '🔗 رابط الإحالة',
    btn_admin_panel: '🛡️ الإدارة',
    wallet_info: (balance: string) => `💼 **محفظتك:**\nالرصيد المتاح: ${balance}\nلتعبئة الرصيد يرجى ضغط زر الإيداع.`,
    btn_deposit: '💵 إيداع رصيد',
    btn_back: '🔙 رجوع',
    services_wip: 'قائمة الخدمات غير متوفرة حالياً (قيد الإعداد). 🚧',
    language_changed: '✅ تم تغيير اللغة إلى العربية.',
    support_msg: 'مرحباً بك في نظام المساعدة. سيتواصل معك أحد أعضاء الدعم قريباً.',
  },
  en: {
    welcome: (name: string, balance: string) => `Welcome to PayMatrix Bot! 🚀\nThe ultimate platform for digital services.\n\n👤 Name: ${name}\n💰 Balance: ${balance}\n\nPlease choose an option below:`,
    btn_services: '🛒 Browse Services',
    btn_wallet: '💼 My Wallet',
    btn_orders: '🧾 My Orders',
    btn_support: '🎧 Support',
    btn_language: '🌐 Change Language (AR)',
    btn_referral: '🔗 Referral Link',
    btn_admin_panel: '🛡️ Admin Panel',
    wallet_info: (balance: string) => `💼 **Your Wallet:**\nAvailable Balance: ${balance}\nTo top up, please click deposit.`,
    btn_deposit: '💵 Deposit',
    btn_back: '🔙 Back',
    services_wip: 'The services list is currently unavailable (WIP). 🚧',
    language_changed: '✅ Language changed to English.',
    support_msg: 'Welcome to the support system. A staff member will contact you shortly.',
  }
};

export const isMenuButton = (text: string): boolean => {
  const buttons = [
    i18n.ar.btn_services, i18n.ar.btn_wallet, i18n.ar.btn_orders, 
    i18n.ar.btn_deposit, i18n.ar.btn_support, i18n.ar.btn_language, i18n.ar.btn_referral,
    i18n.ar.btn_admin_panel,
    i18n.en.btn_services, i18n.en.btn_wallet, i18n.en.btn_orders, 
    i18n.en.btn_deposit, i18n.en.btn_support, i18n.en.btn_language, i18n.en.btn_referral,
    i18n.en.btn_admin_panel
  ];
  return buttons.includes(text);
};
