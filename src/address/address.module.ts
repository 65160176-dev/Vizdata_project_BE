import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AddressService } from './address.service';
import { AddressController } from './address.controller';
import { Address, AddressSchema } from './entities/address.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Address.name, schema: AddressSchema }]),
  ],
  controllers: [AddressController],
  providers: [AddressService],
  exports: [AddressService], // export เผื่อ OrderModule ต้องใช้
})
export class AddressModule { }
