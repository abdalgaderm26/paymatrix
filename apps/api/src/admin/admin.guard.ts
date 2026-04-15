import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const adminKey = request.headers['x-admin-key'];
    const expectedKey = this.configService.get<string>('ADMIN_KEY');

    // SECURITY: If no ADMIN_KEY is configured, fallback to ADMIN_ID
    // but log a warning. In production, ADMIN_KEY should be a strong secret.
    const finalKey = expectedKey || this.configService.get<string>('ADMIN_ID');

    if (!adminKey || !finalKey || adminKey !== finalKey) {
      throw new UnauthorizedException('Access denied. Invalid admin key.');
    }
    return true;
  }
}
