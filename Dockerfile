FROM node:18-alpine

WORKDIR /app

# Copy ไฟล์ package ไปลง dependency ก่อน
COPY package*.json ./
RUN npm install

# Copy โค้ดทั้งหมด
COPY . .

# Build NestJS
RUN npm run build

# เปิด Port 3001
EXPOSE 3001

# คำสั่งรัน
CMD ["npm", "run", "start:prod"]