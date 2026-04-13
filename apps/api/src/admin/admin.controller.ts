import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { OrdersService } from '../orders/orders.service';
import { ServicesService } from '../services/services.service';
import { SettingsService } from '../settings/settings.service';
import { Types } from 'mongoose';

@Controller('api/admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly usersService: UsersService,
    private readonly transactionsService: TransactionsService,
    private readonly ordersService: OrdersService,
    private readonly servicesService: ServicesService,
    private readonly settingsService: SettingsService,
  ) {}

  // ======================== STATS ========================
  @Get('stats')
  async getStats() {
    const [userStats, txStats, orderStats, serviceStats] = await Promise.all([
      this.usersService.getStats(),
      this.transactionsService.getStats(),
      this.ordersService.getStats(),
      this.servicesService.getStats(),
    ]);
    return { users: userStats, transactions: txStats, orders: orderStats, services: serviceStats };
  }

  // ======================== USERS ========================
  @Get('users')
  async getUsers(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(+page, +limit, search);
  }

  @Get('users/:telegramId')
  async getUser(@Param('telegramId') telegramId: string) {
    const user = await this.usersService.findByTelegramId(+telegramId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  @Patch('users/:telegramId/balance')
  async updateBalance(
    @Param('telegramId') telegramId: string,
    @Body() body: { amount: number; operation: 'add' | 'deduct' },
  ) {
    if (!body.amount || body.amount <= 0) {
      throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    }
    const user = await this.usersService.updateBalance(+telegramId, body.amount, body.operation);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  @Patch('users/:telegramId/role')
  async updateRole(
    @Param('telegramId') telegramId: string,
    @Body() body: { role: 'user' | 'admin' },
  ) {
    if (!['user', 'admin'].includes(body.role)) {
      throw new HttpException('Invalid role', HttpStatus.BAD_REQUEST);
    }
    const user = await this.usersService.updateRole(+telegramId, body.role);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  @Patch('users/:telegramId/ban')
  async toggleBan(
    @Param('telegramId') telegramId: string,
    @Body() body: { banned: boolean },
  ) {
    const user = body.banned
      ? await this.usersService.banUser(+telegramId)
      : await this.usersService.unbanUser(+telegramId);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    return user;
  }

  // ======================== TRANSACTIONS ========================
  @Get('transactions')
  async getTransactions(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.transactionsService.findAll(+page, +limit, { type, status });
  }

  @Get('transactions/pending')
  async getPendingDeposits() {
    return this.transactionsService.getPendingDeposits();
  }

  @Patch('transactions/:id/status')
  async updateTransactionStatus(
    @Param('id') id: string,
    @Body() body: { status: 'approved' | 'rejected' },
  ) {
    const tx = await this.transactionsService.findById(id);
    if (!tx) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

    // If approving a deposit, add balance to user
    if (body.status === 'approved' && tx.type === 'deposit') {
      const userDoc = tx.user_id as any;
      const telegramId = userDoc?.telegram_id || userDoc;
      if (telegramId) {
        await this.usersService.updateBalance(
          typeof telegramId === 'number' ? telegramId : +telegramId,
          tx.amount,
          'add',
        );
      }
    }

    return this.transactionsService.updateStatus(id, body.status);
  }

  // ======================== ORDERS ========================
  @Get('orders')
  async getOrders(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
    @Query('status') status?: string,
  ) {
    return this.ordersService.findAll(+page, +limit, { status });
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string) {
    const order = await this.ordersService.findById(id);
    if (!order) throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    return order;
  }

  @Patch('orders/:id/status')
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    return this.ordersService.updateStatus(id, body.status);
  }

  // ======================== SERVICES ========================
  @Get('services')
  async getServices(@Query('page') page = '1', @Query('limit') limit = '50') {
    return this.servicesService.findAll(+page, +limit);
  }

  @Post('services')
  async createService(
    @Body()
    body: {
      name: string;
      description?: string;
      price_usd: number;
      type?: string;
      delivery_details?: string;
    },
  ) {
    if (!body.name || !body.price_usd) {
      throw new HttpException('Name and price are required', HttpStatus.BAD_REQUEST);
    }
    return this.servicesService.create({
      vendor_id: 'admin',
      name: body.name,
      description: body.description || '',
      price_usd: body.price_usd,
      type: body.type || 'digital_product',
      delivery_details: body.delivery_details || '',
    });
  }

  @Put('services/:id')
  async updateService(
    @Param('id') id: string,
    @Body() body: Partial<{
      name: string;
      description: string;
      price_usd: number;
      type: string;
      is_active: boolean;
      delivery_details: string;
    }>,
  ) {
    const service = await this.servicesService.update(id, body);
    if (!service) throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
    return service;
  }

  @Delete('services/:id')
  async deleteService(@Param('id') id: string) {
    const deleted = await this.servicesService.delete(id);
    if (!deleted) throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
    return { success: true };
  }

  @Patch('services/:id/toggle')
  async toggleService(@Param('id') id: string) {
    const service = await this.servicesService.toggleActive(id);
    if (!service) throw new HttpException('Service not found', HttpStatus.NOT_FOUND);
    return service;
  }

  // ======================== SETTINGS ========================
  @Get('settings')
  async getSettings() {
    const wallets = await this.settingsService.getAllDepositMethods();
    const platformSettings = await this.settingsService.getAllPlatformSettings();
    return { wallets, platformSettings };
  }

  @Put('settings/:key')
  async updateSetting(
    @Param('key') key: string,
    @Body() body: { value: string },
  ) {
    return this.settingsService.setSetting(key, body.value);
  }
}
