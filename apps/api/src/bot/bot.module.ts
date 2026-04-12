import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { DepositWizard } from './deposit.wizard';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';
import { SettingsModule } from '../settings/settings.module';
import { AdminSettingsWizard } from './wizards/admin-settings.wizard';
import { AdminUsersWizard } from './wizards/admin-users.wizard';

@Module({
  imports: [UsersModule, ServicesModule, SettingsModule],
  providers: [BotUpdate, DepositWizard, AdminSettingsWizard, AdminUsersWizard],
})
export class BotModule {}
