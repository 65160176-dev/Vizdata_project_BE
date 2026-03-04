import { Injectable } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadImage(file: Express.Multer.File): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'vizdata_products',
        },
        (error, result) => {
          if (error) return reject(error);
          
          // 🚀 แก้ตรงนี้: เช็คว่าถ้าไม่มี result ให้ reject แทนการ resolve(undefined)
          if (!result) {
            return reject(new Error('Cloudinary upload failed: Result is undefined'));
          }
          
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}