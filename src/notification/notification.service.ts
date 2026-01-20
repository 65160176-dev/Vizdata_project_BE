import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
    Notification,
    NotificationDocument,
} from './schemas/notification.schema';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
    findAll() {
        return this.notiModel
            .find()
            .sort({ createdAt: -1 }) // เรียงจากใหม่ไปเก่า
            .exec();
    }
    constructor(
        @InjectModel(Notification.name)
        private notiModel: Model<NotificationDocument>,
        private notiGateway: NotificationGateway, // Inject Gateway เข้ามาเพื่อใช้ส่ง Socket
    ) { }

    // ฟังก์ชันหลัก: สร้างและส่งแจ้งเตือน
    async createAndSend(
        userId: string,
        title: string,
        message: string,
        type: string = 'info',
        data: any = {},
        image: string = '',
    ) {
        // 1. บันทึกลง Database
        const newNoti = new this.notiModel({
            recipient: userId,
            title,
            message,
            type,
            data,
            image,
            isRead: false,
        });
        const savedNoti = await newNoti.save();

        // 2. ส่ง Real-time ไปหา User ผ่าน Socket
        this.notiGateway.sendToUser(userId, savedNoti);

        return savedNoti;
    }

    // ดึงประวัติการแจ้งเตือนทั้งหมดของ User
    async getUserNotifications(userId: string) {
        return this.notiModel
            .find({ recipient: userId })
            .sort({ createdAt: -1 }) // เรียงจากใหม่ไปเก่า
            .exec();
    }

    // ทำเครื่องหมายว่าอ่านแล้ว
    async markAsRead(notiId: string) {
        return this.notiModel.findByIdAndUpdate(
            notiId,
            { isRead: true },
            { new: true },
        );
    }

    async markAllAsRead(userId: string) {
        return this.notiModel
            .updateMany(
                { recipient: userId, isRead: false }, // หาเฉพาะอันที่ยังไม่อ่าน ของ User นี้
                { $set: { isRead: true } }, // แก้เป็น อ่านแล้ว
            )
            .exec();
    }

    // ลบการแจ้งเตือน
    async deleteNotification(notiId: string) {
        return this.notiModel.findByIdAndDelete(notiId);
    }
}
