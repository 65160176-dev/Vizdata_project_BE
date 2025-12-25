import { PartialType } from '@nestjs/mapped-types'; // หรือ @nestjs/swagger
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}