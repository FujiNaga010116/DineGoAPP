import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { HealthCheckResult } from './health.service.js';
import { HealthService } from './health.service.js';

@ApiTags('Health Check')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({
    summary: 'Kiểm tra trạng thái hệ thống',
    description: 'Trả về thông tin trạng thái, phiên bản, uptime và tài nguyên runtime.',
  })
  @ApiResponse({
    status: 200,
    description: 'Dịch vụ đang hoạt động bình thường.',
    schema: {
      example: {
        status: 'ok',
        service: 'dinego-backend',
        version: '1.0.0',
        environment: 'development',
        timestamp: '2026-10-25T15:30:00.000Z',
        uptimeSeconds: 42,
        memoryUsageMb: {
          rss: 45.12,
          heapTotal: 25.34,
          heapUsed: 18.2,
        },
        details: {
          database: {
            status: 'up',
          },
          runtime: {
            nodeVersion: 'v24.22.0',
            platform: 'win32',
          },
        },
      },
    },
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.check();
  }
}
