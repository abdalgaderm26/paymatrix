import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Setting, SettingDocument } from './schemas/setting.schema';

export const DEFAULT_WALLETS = [
  { key: 'USDT_TRC20', label: 'USDT (TRC20)', value: 'غير محدد' },
  { key: 'USDT_BEP20', label: 'USDT (BEP20)', value: 'غير محدد' },
  { key: 'BANKAK', label: 'بنكك (SDG)', value: 'غير محدد' },
  { key: 'FAWRY', label: 'فوري (EGP)', value: 'غير محدد' },
  { key: 'VODAFONE_CASH', label: 'فودافون كاش (EGP)', value: 'غير محدد' },
];

export const DEFAULT_PLATFORM_SETTINGS = [
  { key: 'EXCHANGE_RATE_SDG', label: 'سعر صرف الدولار مقابل الجنيه السوداني', value: '1970' }
];

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>) {}

  async onModuleInit() {
    await this.initDefaultSettings();
  }

  async initDefaultSettings() {
    // Get list of wallets that admin explicitly deleted
    const deletedKeys = await this.getDeletedWalletKeys();

    for (const def of DEFAULT_WALLETS) {
      // Don't recreate wallets that were explicitly deleted by admin
      if (deletedKeys.includes(def.key)) continue;
      const exists = await this.settingModel.findOne({ key: def.key });
      if (!exists) {
        await this.settingModel.create({ key: def.key, value: def.value });
      }
    }
    for (const def of DEFAULT_PLATFORM_SETTINGS) {
      const exists = await this.settingModel.findOne({ key: def.key });
      if (!exists) {
        await this.settingModel.create({ key: def.key, value: def.value });
      }
    }
  }

  async getSetting(key: string): Promise<string | null> {
    const setting = await this.settingModel.findOne({ key });
    return setting ? setting.value : null;
  }

  async setSetting(key: string, value: string): Promise<Setting> {
    return this.settingModel.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );
  }

  async deleteSetting(key: string): Promise<boolean> {
    const result = await this.settingModel.findOneAndDelete({ key });
    return !!result;
  }

  async getDeletedWalletKeys(): Promise<string[]> {
    const raw = await this.getSetting('DELETED_WALLETS');
    if (!raw) return [];
    try { return JSON.parse(raw); } catch { return []; }
  }

  async markWalletDeleted(key: string): Promise<void> {
    const deleted = await this.getDeletedWalletKeys();
    if (!deleted.includes(key)) {
      deleted.push(key);
      await this.setSetting('DELETED_WALLETS', JSON.stringify(deleted));
    }
    // Remove the setting itself
    await this.deleteSetting(key);
  }

  async restoreWallet(key: string): Promise<void> {
    const deleted = await this.getDeletedWalletKeys();
    const updated = deleted.filter(k => k !== key);
    await this.setSetting('DELETED_WALLETS', JSON.stringify(updated));
    // Re-create with default value
    const def = DEFAULT_WALLETS.find(w => w.key === key);
    if (def) {
      await this.setSetting(key, def.value);
    }
  }

  async getAllDepositMethods(): Promise<{key: string, value: string, label?: string}[]> {
    const deletedKeys = await this.getDeletedWalletKeys();

    // Only show default wallets that haven't been deleted
    const activeDefaultKeys = DEFAULT_WALLETS
      .filter(w => !deletedKeys.includes(w.key))
      .map(w => w.key);

    const defaults = await this.settingModel.find({ 
      key: { $in: activeDefaultKeys } 
    }).lean();

    const customWalletsRaw = await this.getSetting('CUSTOM_WALLETS');
    let customWallets: {key: string, value: string, label: string}[] = [];
    if (customWalletsRaw) {
      try {
        customWallets = JSON.parse(customWalletsRaw);
      } catch (e) {
        customWallets = [];
      }
    }

    return [...defaults, ...customWallets];
  }

  async getAllPlatformSettings(): Promise<{key: string, value: string}[]> {
    return this.settingModel.find({ 
      key: { $in: DEFAULT_PLATFORM_SETTINGS.map(w => w.key) } 
    }).lean();
  }
}
