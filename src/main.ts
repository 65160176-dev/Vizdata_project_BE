import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe, Logger } from '@nestjs/common'; // ✅ เพิ่ม Logger เข้ามาช่วยดู Log

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for Nuxt frontend (คงเดิม)
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // Enable validation globally (คงเดิม)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Set global prefix for all routes (คงเดิม)
  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth() // คงเดิม
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document); // คงเดิม (เข้าผ่าน /api)

  // ⚠️ แก้จุดนี้จุดเดียวครับ: เปลี่ยน Default Port เป็น 3001
  // เพราะ Frontend ใช้ 3000 ไปแล้ว ถ้าไม่แก้จะรันไม่ขึ้นครับ
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  
  // ✅ เพิ่ม Log บอก URL ให้กดง่ายๆ (ไม่กระทบการทำงานอื่น)
  console.log(`🚀 Server is running on: http://localhost:${port}/api`);
}
bootstrap();