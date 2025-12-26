import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        // ดึงค่าเดิมจาก .env มาเก็บไว้ก่อน
        const uri = configService.get<string>('MONGODB_URI');
        
        return {
          // ✅ ตรงนี้คือจุดสำคัญ: เราเอาค่าเดิมมาต่อด้วย "/Vizdata"
          uri: `${uri}/Vizdata`, 
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}