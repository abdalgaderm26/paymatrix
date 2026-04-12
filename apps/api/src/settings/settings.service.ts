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

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(@InjectModel(Setting.name) private settingModel: Model<SettingDocument>) {}

  async onModuleInit() {
    await this.initDefaultSettings();
  }

  async initDefaultSettings() {
    for (const def of DEFAULT_WALLETS) {
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

  async getAllDepositMethods(): Promise<{key: string, value: string}[]> {
    return this.settingModel.find({ 
      key: { $in: DEFAULT_WALLETS.map(w => w.key) } 
    }).lean();
  }
}
