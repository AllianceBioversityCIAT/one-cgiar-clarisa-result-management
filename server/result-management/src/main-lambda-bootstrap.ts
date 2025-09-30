import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { CGIARLogger } from './shared/utils/logger.util';
import { urlencoded } from 'express';
import { ConfigService } from '@nestjs/config';

// Builds the Nest application without calling listen(), to be reused by Lambda handler
export async function createApp() {
  const logger = new CGIARLogger('LambdaBootstrap');
  const app = await NestFactory.create(AppModule);

  app.use(
    helmet({
      contentSecurityPolicy: false,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      noSniff: true,
      xssFilter: true,
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      crossOriginEmbedderPolicy: false,
      referrerPolicy: false,
    }),
  );

  app.use(urlencoded({ extended: true, limit: '50mb' }));
  app.enableCors();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
  // Make Swagger "Try it out" include the API Gateway stage (e.g. /prod)
  const stage = process.env.APIGW_STAGE || process.env.STAGE || 'prod';

  const config = new DocumentBuilder()
    .setTitle('CLARISA Result Management API')
    .setDescription('API for managing CLARISA results')
    .setVersion('1.0')
    .addTag('results')
    .addBearerAuth()
    .addServer(`/${stage}`)
    .build();
  // <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('CL_PORT');
  if (!port)
    logger.warn('CL_PORT is not defined; continuing without HTTP listener');

  await app.init();
  logger.debug('Nest application initialised for Lambda');
  return app;
}
