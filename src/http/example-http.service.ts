// Example Service using Axios in NestJS Backend
import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ExampleHttpService {
  constructor(private readonly httpService: HttpService) {}

  // Example: Call external API
  async fetchExternalData(url: string) {
    try {
      const response = await firstValueFrom(this.httpService.get(url));
      return response.data;
    } catch (error) {
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  // Example: POST request
  async postData(url: string, data: any) {
    try {
      const response = await firstValueFrom(this.httpService.post(url, data));
      return response.data;
    } catch (error) {
      throw new Error(`Failed to post data: ${error.message}`);
    }
  }
}
