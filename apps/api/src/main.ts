import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.MOBILE_APP_URL,
    'http://localhost:3000',
    'http://localhost:5173',
  ].filter(Boolean) as string[];
  app.enableCors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
