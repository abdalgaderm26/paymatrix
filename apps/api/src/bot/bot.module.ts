import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { DepositWizard } from './deposit.wizard';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';
import { SettingsModule } from '../settings/settings.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { OrdersModule } from '../orders/orders.module';
import { AdminSettingsWizard } from './wizards/admin-settings.wizard';
import { AdminUsersWizard } from './wizards/admin-users.wizard';
import { AdminServicesWizard } from './wizards/admin-services.wizard';

@Module({
  imports: [UsersModule, ServicesModule, SettingsModule, TransactionsModule, OrdersModule],
  providers: [BotUpdate, DepositWizard, AdminSettingsWizard, AdminUsersWizard, AdminServicesWizard],
})
export class BotModule {}
