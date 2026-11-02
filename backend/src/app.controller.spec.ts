import { Test, TestingModule } from '@nestjs/testing';
import { describe, expect, it, beforeEach } from 'vitest';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return application information', () => {
      const info = appController.getAppInfo();
      expect(info).toHaveProperty('name', 'DineGo Backend API');
      expect(info).toHaveProperty('version', '1.0.0');
      expect(info).toHaveProperty('health', '/api/v1/health');
    });
  });
});
