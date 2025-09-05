// DevAtlas API Main Entry Point
// Created by Balaji Koneti

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';

async function bootstrap() {
  // Create NestJS application
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000');
  app.enableCors({
    origin: allowedOrigins.split(','),
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('DevAtlas API')
    .setDescription('DevAtlas - Developer and Codebase Analysis Platform')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('projects', 'Project management')
    .addTag('analyses', 'Analysis operations')
    .addTag('repos', 'Repository data')
    .addTag('search', 'Semantic search')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // Start server
  const port = configService.get<number>('PORT', 8080);
  await app.listen(port);

  console.log(`🚀 DevAtlas API running on port ${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  console.error('❌ Failed to start API server:', error);
  process.exit(1);
});
