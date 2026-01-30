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

    // ✅✅ ฟังก์ชันที่แก้ไขแล้ว: เช็คก่อนว่ามีไหม ถ้ามี Update ถ้าไม่มี(หรือถูกลบ) Create ใหม่ ✅✅
    async createOrUpdate(
        userId: string,
        title: string,
        message: string,
        type: string = 'info',
        data: any = {},
        image: string = '',
    ) {
        // 1. สร้างเงื่อนไขเพื่อค้นหา "แจ้งเตือนเดิม"
        const filter: any = {
            recipient: userId,
            type: type,
        };

        // ถ้ามี orderId หรือ role ให้ใส่ไปใน filter ด้วย
        if (data?.orderId) filter['data.orderId'] = data.orderId;
        if (data?.role) filter['data.role'] = data.role;

        // 2. 🔍 ลองค้นหาดูก่อน
        const existingNoti = await this.notiModel.findOne(filter);

        // 3. กรณี: เจอของเดิม (แปลว่ายังไม่ถูกลบ) -> ให้ Update
        if (existingNoti) {
            existingNoti.title = title;
            existingNoti.message = message;
            if (image) existingNoti.image = image;
            existingNoti.data = data;

            // 🔴 รีเซ็ตสถานะเป็น "ยังไม่อ่าน"
            existingNoti.isRead = false;

            // 🔴 อัปเดตเวลาเป็นปัจจุบัน (เพื่อให้เด้งไปบนสุด)
            // (ต้องแน่ใจว่าใน Schema ไม่ได้ตั้ง immutable: true ที่ createdAt)
            existingNoti.createdAt = new Date() as any;

            const savedNoti = await existingNoti.save();
            this.notiGateway.sendToUser(userId, savedNoti);
            return savedNoti;
        }

        // 4. กรณี: ไม่เจอ (แปลว่า Order ใหม่ หรือ User ลบทิ้งไปแล้ว) -> ให้ Create ใหม่
        const newNoti = new this.notiModel({
            recipient: userId,
            title,
            message,
            type,
            data,
            image,
            isRead: false,
            // createdAt จะถูกสร้างอัตโนมัติโดย Mongoose หรือจะใส่เองก็ได้
            createdAt: new Date(),
        });

        const savedNoti = await newNoti.save();
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

    async deleteAll(userId: string) {
        return this.notiModel.deleteMany({ recipient: userId }).exec();
    }
}