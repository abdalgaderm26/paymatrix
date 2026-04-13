import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for dashboard
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:4173', 'https://*.railway.app'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 PayMatrix API running on port ${process.env.PORT ?? 3000}`);
}
bootstrap();
