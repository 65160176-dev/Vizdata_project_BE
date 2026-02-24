import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 1. ตั้งค่าโฟลเดอร์สำหรับเก็บไฟล์ (เช่น รูปภาพ)
  // เวลาเรียกใช้จะผ่าน URL: http://localhost:3001/uploads/filename.jpg
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });

  // 2. ตั้งค่า CORS (สำคัญมากเพื่อให้ Frontend บน Netlify เรียกใช้ได้)
  app.enableCors({
    origin: true, // 🟢 แก้ไขตรงนี้: เปิดประตูรับทุกเว็บ (รวมถึง Netlify) 🟢
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 3. ตั้งค่า Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 4. ตั้งค่า Prefix ให้ API (เช่น /api/users)
  app.setGlobalPrefix('api');

  // 5. ตั้งค่า Swagger (Documentation)
  const config = new DocumentBuilder()
    .setTitle('User API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 6. เริ่มต้น Server
  const port = process.env.PORT ?? 3001;
  
  // *** สำคัญมากสำหรับ Docker: ต้องเพิ่ม '0.0.0.0' เพื่อให้เข้าถึงได้จากภายนอก Container ***
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server is running on: http://localhost:${port}/api`);
  console.log(`� Images are stored as base64 in MongoDB (no local uploads folder needed)`);
}
bootstrap();