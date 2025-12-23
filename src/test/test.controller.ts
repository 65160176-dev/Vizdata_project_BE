import { Controller, Get, Post, Delete, Body } from '@nestjs/common';
import { TestService } from './test.service';

@Controller('test')
export class TestController {
  constructor(private readonly testService: TestService) {}

  @Get('connection')
  async checkConnection() {
    return this.testService.getConnectionStatus();
  }

  @Post()
  async createTest(@Body('message') message: string) {
    if (!message) {
      return { error: 'Message is required' };
    }
    return this.testService.createTest(message);
  }

  @Get()
  async getAllTests() {
    return this.testService.getAllTests();
  }

  @Delete()
  async deleteAll() {
    return this.testService.deleteAll();
  }
}
