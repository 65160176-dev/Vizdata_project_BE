import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // อนุญาตให้ Frontend (Nuxt) เชื่อมต่อได้จากทุกโดเมน
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // ตัวแปรเก็บคู่จับ UserID <-> SocketID
  private userSockets = new Map<string, string>();

  // เมื่อ Frontend เชื่อมต่อเข้ามา
  handleConnection(client: Socket) {
    const userId = client.handshake.query.userId as string;
    if (userId) {
      this.userSockets.set(userId, client.id);
      console.log(`✅ User connected: ${userId} (Socket: ${client.id})`);
    }
  }

  // เมื่อ Frontend ตัดการเชื่อมต่อ
  handleDisconnect(client: Socket) {
    // ลบ User ออกจาก Map (อาจต้องเขียน Logic เพิ่มถ้า 1 User Login หลายเครื่อง)
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        console.log(`❌ User disconnected: ${userId}`);
        break;
      }
    }
  }

  // ฟังก์ชันสำหรับส่งแจ้งเตือนไปหา User คนนั้น
  sendToUser(userId: string, payload: any) {
    const socketId = this.userSockets.get(userId);
    if (socketId) {
      this.server.to(socketId).emit('receive_notification', payload);
      console.log(`🚀 Sent notification to User: ${userId}`);
    } else {
      console.log(`⚠️ User ${userId} is offline, saved to DB only.`);
    }
  }
}