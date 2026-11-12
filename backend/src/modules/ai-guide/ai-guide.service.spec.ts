import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Role } from '../../common/enums/index.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { AiGuideService } from './ai-guide.service.js';

describe('AiGuideService (Sprint 4 — U034 đến U038)', () => {
  let service: AiGuideService;

  const mockUser: AuthenticatedUser = {
    id: 'user-ai-1',
    email: 'test@dinego.vn',
    fullName: 'Khách thử nghiệm AI',
    isActive: true,
    roles: [Role.CUSTOMER],
  };

  const mockPrisma = {
    menuItem: {
      findMany: vi.fn(),
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AiGuideService(mockPrisma as unknown as PrismaService);
  });

  describe('chat & RAG Local Knowledge (U034, U035, U036)', () => {
    it('should retrieve regional knowledge and suggest matching dishes with deep links', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        {
          id: 'dish-pho-1',
          name: 'Phở Bò Tái Nạm',
          basePrice: 55000,
          merchant: { name: 'Phở Gia Truyền Hà Nội', slug: 'pho-gia-truyen' },
        },
      ]);

      const res = await service.chat(mockUser, {
        message: 'Kể cho mình nghe câu chuyện về Phở Hà Nội và gợi ý quán ngon với',
      });

      expect(res.reply.content).toContain('Phở');
      expect(res.reply.content).toContain('Hà Nội');
      expect(res.recommendations.length).toBe(1);
      expect(res.recommendations[0].deepLink).toContain('/restaurants/pho-gia-truyen');
      expect(res.session.messages.length).toBe(2); // user + assistant
    });

    it('should maintain chat session history across consecutive messages (U034)', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([]);

      const firstChat = await service.chat(mockUser, {
        message: 'Chào bạn!',
      });
      const sessionId = firstChat.session.id;

      const secondChat = await service.chat(mockUser, {
        message: 'Món nào ngon ở Sài Gòn?',
        sessionId,
      });

      expect(secondChat.session.id).toBe(sessionId);
      expect(secondChat.session.messages.length).toBe(4); // 2 user + 2 assistant
    });
  });

  describe('AI Guardrails & Rate Limiting (U038)', () => {
    it('should reject out-of-scope non-culinary questions (e.g. politics, bitcoin)', async () => {
      await expect(
        service.chat(mockUser, { message: 'Dự đoán giá tiền ảo bitcoin ngày mai' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should enforce rate limiting of 20 queries per hour', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([]);

      for (let i = 0; i < 20; i++) {
        await service.chat(mockUser, { message: `Câu hỏi số ${i + 1}` });
      }

      // The 21st query should be rejected
      await expect(
        service.chat(mockUser, { message: 'Câu hỏi số 21 vượt limit' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Natural Language Search & Intent Parsing (U037)', () => {
    it('should extract budget, region, and keywords accurately', () => {
      const intent = service.parseNaturalIntent('Tìm quán bún chả Hà Nội giá dưới 60k cho 2 người');
      expect(intent.region).toBe('NORTH');
      expect(intent.maxBudget).toBe(60000);
      expect(intent.partySize).toBe(2);
      expect(intent.keywords).toContain('bún');
    });

    it('should return natural language search results', async () => {
      mockPrisma.menuItem.findMany.mockResolvedValue([
        {
          id: 'dish-bc-1',
          name: 'Bún Chả Nem Cua Bể',
          basePrice: 50000,
          merchant: { name: 'Bún Chả Cố Đô', slug: 'bun-cha-co-do', isOpen: true },
        },
      ]);

      const res = await service.naturalLanguageSearch({
        query: 'Tìm bún chả dưới 70k',
      });

      expect(res.resultsCount).toBe(1);
      expect(res.dishes[0].name).toBe('Bún Chả Nem Cua Bể');
    });
  });
});

