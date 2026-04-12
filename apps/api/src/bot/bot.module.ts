import { Module } from '@nestjs/common';
import { BotUpdate } from './bot.update';
import { DepositWizard } from './deposit.wizard';
import { UsersModule } from '../users/users.module';
import { ServicesModule } from '../services/services.module';

@Module({
  imports: [UsersModule, ServicesModule],
  providers: [BotUpdate, DepositWizard],
})
export class BotModule {}
