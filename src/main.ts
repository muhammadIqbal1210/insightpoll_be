import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule, ObserveInstrument } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });

  // Izinkan CORS untuk Frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Enable request body validation DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Serve folder uploads sebagai static files
  const express = await import('express');
  const path = await import('path');
  app.use('/uploads', express.default.static(path.join(process.cwd(), 'uploads')));

  const port = process.env.PORT || '4000';
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
await bootstrap();

