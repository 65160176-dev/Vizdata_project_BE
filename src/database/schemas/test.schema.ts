import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type TestDocument = HydratedDocument<Test>;

@Schema({ timestamps: true })
export class Test {
  @Prop({ required: true })
  message: string;

  @Prop()
  status: string;
}

export const TestSchema = SchemaFactory.createForClass(Test);
