import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationDocument = Notification & Document;

@Schema({ timestamps: true }) // เปิด timestamps เพื่อให้มี createdAt, updatedAt อัตโนมัติ
export class Notification {
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    recipient: Types.ObjectId; // ID ของ User ที่จะได้รับแจ้งเตือน

    @Prop({ required: true })
    title: string; // หัวข้อแจ้งเตือน

    @Prop({ required: true })
    message: string; // ข้อความรายละเอียด

    @Prop({ default: 'info' })
    type: string; // ประเภท: order, promotion, system

    @Prop({ type: Object })
    data: any; // ข้อมูลเสริม (เช่น orderId เพื่อให้ Frontend กดแล้วลิงก์ไปถูกหน้า)

    @Prop({ default: false })
    isRead: boolean; // สถานะว่าอ่านหรือยัง

    @Prop()
    image: string; // รูปภาพประกอบ (ถ้ามี)
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
