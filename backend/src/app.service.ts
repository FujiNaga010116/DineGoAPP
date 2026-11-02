import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getAppInfo() {
    return {
      name: 'DineGo Backend API',
      version: '1.0.0',
      description: 'DineGo — Ứng dụng đặt đồ ăn hằng ngày, mâm cỗ sự kiện & AI Culinary Guide (Nhóm 17)',
      docs: '/api/docs',
      health: '/api/v1/health',
    };
  }
}
