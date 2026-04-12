import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { UsersService } from '../../users/users.service';

@Injectable()
export class BanGuard implements CanActivate {
  constructor(private readonly usersService: UsersService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const ctx = TelegrafExecutionContext.create(context).getContext();
    const from = ctx.from;
    
    if (!from) return true;

    const user = await this.usersService.findByTelegramId(from.id);
    if (user && user.is_banned) {
      try {
        await ctx.reply('🚫 حسابك محظور من استخدام المنصة. إذا كنت تعتقد أن هذا خطأ، تواصل مع فريق الدعم.');
      } catch (e) {}
      return false;
    }
    return true;
  }
}
