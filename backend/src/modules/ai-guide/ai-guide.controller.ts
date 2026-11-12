// ==============================================================================
// DineGo Backend — AI Local Culinary Guide Controller (Sprint 4 — U034 đến U038)
// ==============================================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Roles } from '../../common/decorators/roles.decorator.js';
import { Role } from '../../common/enums/index.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../../common/guards/roles.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import {
  NaturalLanguageSearchDto,
  SendChatMessageDto,
  UpsertKnowledgeDto,
} from './dto/chat-message.dto.js';
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

  // ----------------------------------------------------------------------------
  // U036: QUẢN TRỊ CƠ SỞ TRI THỨC ẨM THỰC ĐỊA PHƯƠNG (ADMIN RAG CRUD)
  // ----------------------------------------------------------------------------

  @Get('knowledge')
  @ApiOperation({
    summary: 'U036: Danh sách cơ sở tri thức ẩm thực địa phương (RAG Knowledge Base)',
  })
  @ApiQuery({ name: 'region', required: false, enum: ['NORTH', 'CENTRAL', 'SOUTH'] })
  getAllKnowledge(@Query('region') region?: 'NORTH' | 'CENTRAL' | 'SOUTH') {
    return this.aiGuideService.getAllKnowledge(region);
  }

  @Post('knowledge')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U036: Admin thêm mới đặc sản ẩm thực địa phương vào RAG Knowledge Base',
  })
  createKnowledge(@Body() dto: UpsertKnowledgeDto) {
    return this.aiGuideService.createKnowledge(dto);
  }

  @Patch('knowledge/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U036: Admin cập nhật mục tri thức ẩm thực địa phương',
  })
  @ApiParam({ name: 'id', description: 'ID mục tri thức' })
  updateKnowledge(@Param('id') id: string, @Body() dto: UpsertKnowledgeDto) {
    return this.aiGuideService.updateKnowledge(id, dto);
  }

  @Delete('knowledge/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'U036: Admin xóa mục tri thức ẩm thực khỏi RAG Knowledge Base',
  })
  @ApiParam({ name: 'id', description: 'ID mục tri thức' })
  deleteKnowledge(@Param('id') id: string) {
    return this.aiGuideService.deleteKnowledge(id);
  }
}

