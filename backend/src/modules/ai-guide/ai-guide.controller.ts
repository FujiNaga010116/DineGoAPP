// ==============================================================================
// DineGo Backend — AI Local Culinary Guide Controller (Sprint 4 — U034 đến U038)
// ==============================================================================

import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { NaturalLanguageSearchDto, SendChatMessageDto } from './dto/chat-message.dto.js';
import { AiGuideService } from './ai-guide.service.js';

@ApiTags('AI Local Culinary Guide (Sprint 4 — U034 đến U038)')
@Controller('ai')
export class AiGuideController {
  constructor(private readonly aiGuideService: AiGuideService) {}

  @Post('chat')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U034 & U035: Trò chuyện và nhận gợi ý món ngon cùng AI Local Guide',
    description:
      'Tích hợp RAG cơ sở tri thức ẩm thực địa phương (U036), Guardrail an toàn (U038) và trả về thẻ món kèm link đặt hàng trực tiếp (U035).',
  })
  @ApiResponse({ status: 200, description: 'Phản hồi tư vấn ẩm thực thành công.' })
  @ApiResponse({ status: 400, description: 'Vi phạm Guardrail an toàn hoặc vượt giới hạn rate limit.' })
  chat(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SendChatMessageDto,
  ) {
    return this.aiGuideService.chat(user, dto);
  }

  @Get('sessions/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U034: Tải lại lịch sử hội thoại của phiên chat',
  })
  @ApiParam({ name: 'id', description: 'ID phiên trò chuyện' })
  getSessionHistory(
    @Param('id') sessionId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiGuideService.getSessionHistory(sessionId, userId);
  }

  @Post('search')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'U037: Tìm kiếm món ăn bằng câu lệnh ngôn ngữ tự nhiên',
    description: 'Tự động trích xuất ý định (Intent), ngân sách và vùng miền để lọc món ăn tương ứng.',
  })
  naturalLanguageSearch(@Body() dto: NaturalLanguageSearchDto) {
    return this.aiGuideService.naturalLanguageSearch(dto);
  }
}

