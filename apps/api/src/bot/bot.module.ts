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
import { AdminBroadcastWizard } from './wizards/admin-broadcast.wizard';
import { AdminAddServiceWizard } from './wizards/admin-add-service.wizard';
import { AdminAddWalletWizard } from './wizards/admin-add-wallet.wizard';

@Module({
  imports: [UsersModule, ServicesModule, SettingsModule, TransactionsModule, OrdersModule],
  providers: [BotUpdate, DepositWizard, AdminSettingsWizard, AdminUsersWizard, AdminServicesWizard, AdminBroadcastWizard, AdminAddServiceWizard, AdminAddWalletWizard],
})
export class BotModule {}
