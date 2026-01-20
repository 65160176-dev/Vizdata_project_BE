import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Notification')
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  // ✅ [เพิ่มใหม่] API ดึงการแจ้งเตือนทั้งหมดของทุก User (สำหรับ Admin)
  @Get()
  @ApiOperation({ summary: 'ดึงรายการแจ้งเตือนทั้งหมด (All Users)' })
  async getAllNotifications() {
    return await this.notificationService.findAll();
  }

  // API ดึงประวัติการแจ้งเตือน (Frontend เรียกใช้ตอนโหลดหน้า Noti)
  @Get('user/:userId')
  @ApiOperation({ summary: 'ดึงประวัติการแจ้งเตือนของ User' })
  async getHistory(@Param('userId') userId: string) {
    return await this.notificationService.getUserNotifications(userId);
  }

  // API อ่านแจ้งเตือน
  @Patch(':id/read')
  @ApiOperation({ summary: 'เปลี่ยนสถานะเป็นอ่านแล้ว' })
  async readNotification(@Param('id') id: string) {
    return await this.notificationService.markAsRead(id);
  }

  // API ลบแจ้งเตือน
  @Delete(':id')
  @ApiOperation({ summary: 'ลบการแจ้งเตือน' })
  async deleteNotification(@Param('id') id: string) {
    return await this.notificationService.deleteNotification(id);
  }

  @Patch('read-all/:userId') // ex: /notifications/read-all/64b123...
  async markAllAsRead(@Param('userId') userId: string) {
    return this.notificationService.markAllAsRead(userId);
  }

  // API สำหรับทดสอบส่ง (ใช้ยิงเล่นใน Swagger)
  @Post('send-test')
  @ApiOperation({ summary: '[Dev Only] ทดสอบส่ง Notification' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        userId: { type: 'string', example: '65a123...' },
        title: { type: 'string', example: 'Order Update' },
        message: { type: 'string', example: 'Your order has been shipped!' },
        type: { type: 'string', example: 'order' },
      },
    },
  })
  async sendTest(@Body() body: any) {
    const { userId, title, message, type } = body;
    return await this.notificationService.createAndSend(
      userId,
      title,
      message,
      type,
    );
  }
}
