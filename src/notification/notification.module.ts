import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationGateway } from './notification.gateway';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { Notification, NotificationSchema } from './schemas/notification.schema';

@Module({
  imports: [
    // จดทะเบียน Schema เพื่อให้ Service ใช้งาน Database ได้
    MongooseModule.forFeature([
      { name: Notification.name, schema: NotificationSchema },
    ]),
  ],
  controllers: [NotificationController],
  providers: [NotificationGateway, NotificationService],
  exports: [NotificationService], // Export เพื่อให้ Module อื่น (เช่น OrderModule) เรียกใช้ได้
})
export class NotificationModule { }