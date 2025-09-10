import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CGIARLogger } from './shared/utils/logger.util';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const logger = new CGIARLogger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: false,
    }),
  );
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.use(json({ limit: '50mb' }));
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('CLARISA Result Management API')
    .setDescription('API for managing CLARISA results')
    .setVersion('1.0')
    .addTag('results')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('CL_PORT');

  if (!port) {
    throw new Error('The port is not defined in environment variables');
  }
  await app.listen(port).then(() => {
    logger.debug(`Application is running on: http://localhost:${port}`);
    logger.debug(`Swagger is running on: http://localhost:${port}/api/docs`);
  });
}
bootstrap();
