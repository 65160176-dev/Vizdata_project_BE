import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { TestModule } from './test/test.module';
import { UsersModule } from './users/users.module';
import { HttpConfigModule } from './http/http-config.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TestModule,
    UsersModule,
    HttpConfigModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
