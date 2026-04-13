import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { UsersModule } from '../users/users.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { OrdersModule } from '../orders/orders.module';
import { ServicesModule } from '../services/services.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [UsersModule, TransactionsModule, OrdersModule, ServicesModule, SettingsModule],
  controllers: [AdminController],
  providers: [AdminGuard],
})
export class AdminModule {}
