import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'];
    const expectedKey = this.configService.get<string>('ADMIN_KEY') || this.configService.get<string>('ADMIN_ID');

    if (!adminKey || adminKey !== expectedKey) {
      throw new UnauthorizedException('Access denied. Invalid admin key.');
    }
    return true;
  }
}
