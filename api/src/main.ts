import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  // LINE webhook needs raw body for signature verification.
  // Capture raw body but still parse JSON for handlers.
  app.use(
    json({
      verify: (req: any, _res, buf) => {
        req.rawBody = buf;
      },
    }),
  );

  app.setGlobalPrefix('api');
  // CORS: comma-separated list of allowed origins.
  // Local default: Vite dev server. Production: set WEB_ORIGIN to your
  // deployed web URL (e.g. https://dreamabroad.up.railway.app).
  const origins = (process.env.WEB_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const config = new DocumentBuilder()
    .setTitle('DreamAbroad CRM')
    .setVersion('1.0')
    .addApiKey({ type: 'apiKey', name: 'X-Agent-Id', in: 'header' }, 'agent-id')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(3000);
}
bootstrap();
