import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import * as compression from 'compression'; // 🚀 1. Import ตัวบีบอัดข้อมูล

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // 🚀 2. เปิดใช้งาน Compression (ท่าไม้ตาย!)
  // บีบอัดก้อน Base64 มหาศาลให้เล็กลงก่อนส่งผ่านเน็ต ช่วยให้เว็บโหลดไวขึ้นหลายเท่าตัว
  app.use(compression());

  // 3. ขยาย limit การรับข้อมูล (ปรับเป็น 50mb เผื่อรองรับ Base64 ขนาดใหญ่จากหน้าบ้าน)
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // 4. ตั้งค่า CORS (เพื่อให้ Frontend บน Netlify เรียก API ได้)
  app.enableCors({
    origin: true, // ถ้าเว็บขึ้น Production แล้ว แนะนำให้เปลี่ยน true เป็น URL ของ Netlify แทนครับ
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  // 5. ตั้งค่า Validation Pipe กรองข้อมูลขยะ
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // 6. ตั้งค่า Prefix ให้ API เป็น /api
  app.setGlobalPrefix('api');

  // 7. ตั้งค่า Swagger (Documentation)
  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API documentation with Base64 Image Support')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // 8. เริ่มต้น Server
  const port = process.env.PORT || 3001;
  
  // 🚀 9. สำคัญมากสำหรับ Railway: ต้อง bind ไปที่ '0.0.0.0' เท่านั้น
  await app.listen(port, '0.0.0.0');

  console.log(`🚀 Server is running on: http://localhost:${port}/api`);
  console.log(`⚡ Gzip Compression is ENABLED for faster Base64 transfer!`);
}
bootstrap();