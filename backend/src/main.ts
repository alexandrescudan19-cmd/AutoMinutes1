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

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
  app.enableCors({
    origin: frontendUrl.split(',').map((origin) => origin.trim()),
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

  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
