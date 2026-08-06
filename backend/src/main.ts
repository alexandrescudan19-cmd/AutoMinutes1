import * as dotenv from 'dotenv';
dotenv.config();

import * as dns from 'node:dns';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

if (process.env.MONGODB_URI?.startsWith('mongodb+srv://')) {
  dns.setServers((process.env.DNS_SERVERS ?? '1.1.1.1,8.8.8.8').split(','));
}

function parseOrigins(value?: string) {
  return (value ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  const corsOrigins = process.env.CORS_ORIGINS ?? frontendUrl;
  const allowAnyOrigin = corsOrigins.trim() === '*';
  const allowedOrigins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...parseOrigins(frontendUrl),
    ...parseOrigins(corsOrigins),
  ]);

  app.enableCors({
    origin(origin, callback) {
      if (
        allowAnyOrigin ||
        !origin ||
        allowedOrigins.has(origin.replace(/\/+$/, '')) ||
        /^https:\/\/[a-z0-9-]+\.euw\.devtunnels\.ms$/i.test(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`CORS origin not allowed: ${origin}`));
    },
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.useBodyParser('text');

  const swaggerConfig = new DocumentBuilder()
    .setTitle('AutoMinutes API')
    .setDescription(
      'API pentru utilizatori, sedinte, participanti si procesarea transcripturilor cu AI.',
    )
    .setVersion('1.0')
    .addTag('users', 'Operatii pentru utilizatori')
    .addTag('meetings', 'Operatii pentru sedinte')
    .addTag('attendees', 'Operatii pentru participanti')
    .addTag('ai', 'Procesare transcripturi si rezultate AI')
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(Number(process.env.PORT ?? 3000), process.env.HOST ?? '0.0.0.0');
}
void bootstrap();
