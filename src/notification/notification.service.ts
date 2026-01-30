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
    constructor(
        @InjectModel(Notification.name)
        private notiModel: Model<NotificationDocument>,
        private notiGateway: NotificationGateway,
    ) { }

    findAll() {
        return this.notiModel
            .find()
            .sort({ createdAt: -1 })
            .exec();
    }

    // ฟังก์ชันเดิม: สร้างใหม่เสมอ (Create Only)
    async createAndSend(
        userId: string,
        title: string,
        message: string,
        type: string = 'info',
        data: any = {},
        image: string = '',
    ) {
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
        this.notiGateway.sendToUser(userId, savedNoti);
        return savedNoti;
    }

    // ✅✅ ฟังก์ชันใหม่: สร้างหรืออัปเดตแจ้งเตือนเดิม (Upsert) ✅✅
    async createOrUpdate(
        userId: string,
        title: string,
        message: string,
        type: string = 'info',
        data: any = {},
        image: string = '',
    ) {
        // 1. สร้างเงื่อนไขเพื่อค้นหา "แจ้งเตือนเดิม"
        // เราจะดูว่า User คนนี้ มีแจ้งเตือน Type นี้ และ Order ID นี้อยู่แล้วหรือไม่
        const filter: any = {
            recipient: userId,
            type: type,
        };

        // ถ้าใน data มี orderId ให้ใช้เป็น key หลักในการเช็คว่าซ้ำไหม
        if (data && data.orderId) {
            filter['data.orderId'] = data.orderId;
        }
        // ถ้าใน data มี role (buyer/seller) ให้แยกกันด้วย
        if (data && data.role) {
            filter['data.role'] = data.role;
        }

        // 2. ข้อมูลที่จะอัปเดตทับลงไป
        const update = {
            $set: {
                title,
                message,
                image,
                data, // อัปเดต data เผื่อสถานะเปลี่ยน
                isRead: false,        // 🔴 สำคัญ: รีเซ็ตให้เป็น "ยังไม่อ่าน" เพื่อให้เด้งเตือนใหม่
                createdAt: new Date() // 🔴 สำคัญ: อัปเดตเวลาเพื่อให้มันเด้งไปอยู่บนสุดของ List
            }
        };

        // 3. ใช้คำสั่ง findOneAndUpdate พร้อม options { upsert: true }
        // - ถ้าเจอ: อัปเดต
        // - ถ้าไม่เจอ: สร้างใหม่
        const savedNoti = await this.notiModel.findOneAndUpdate(
            filter,
            update,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        ).exec();

        // 4. ส่ง Socket Real-time
        // ฝั่ง Frontend ถ้าจัดการดีๆ จะเห็นว่า ID เดิมมีการเปลี่ยนแปลง หรือถ้า Frontend เรียงตาม createdAt มันก็จะเด้งขึ้นบนสุด
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
                { recipient: userId, isRead: false },
                { $set: { isRead: true } },
            )
            .exec();
    }

    // ลบการแจ้งเตือน
    async deleteNotification(notiId: string) {
        return this.notiModel.findByIdAndDelete(notiId);
    }
}