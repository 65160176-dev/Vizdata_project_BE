import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Test, TestDocument } from '../database/schemas/test.schema';

@Injectable()
export class TestService {
  constructor(@InjectModel(Test.name) private testModel: Model<TestDocument>) {}

  async createTest(message: string): Promise<Test> {
    const newTest = new this.testModel({
      message,
      status: 'success',
    });
    return newTest.save();
  }

  async getAllTests(): Promise<Test[]> {
    return this.testModel.find().exec();
  }

  async getConnectionStatus(): Promise<any> {
    try {
      const count = await this.testModel.countDocuments();
      return {
        status: 'connected',
        message: 'Database connection successful',
        documentsCount: count,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  }

  async deleteAll(): Promise<any> {
    const result = await this.testModel.deleteMany({});
    return {
      status: 'success',
      deletedCount: result.deletedCount,
    };
  }
}
