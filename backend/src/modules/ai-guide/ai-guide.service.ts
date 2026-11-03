// ==============================================================================
// DineGo Backend — AI Local Culinary Guide Service (Sprint 4 — U034 đến U038)
// Architecture: Local Knowledge RAG + AI Guardrails + Intent-Driven Recommendations
// ==============================================================================

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import crypto from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { NaturalLanguageSearchDto, SendChatMessageDto } from './dto/chat-message.dto.js';
import type {
  ChatMessage,
  ChatSession,
  CulinaryRecommendation,
  GuardrailCheckResult,
  LocalCulinaryKnowledge,
  ParsedLocalIntent,
} from './interfaces/ai-guide.interface.js';

@Injectable()
export class AiGuideService {
  private readonly logger = new Logger(AiGuideService.name);

  // In-memory Stores for Chat Sessions and Rate Limits
  private readonly sessions = new Map<string, ChatSession>();
  private readonly userRateLimits = new Map<string, { count: number; resetAt: number }>();

  // RAG Knowledge Base: Cơ sở tri thức ẩm thực địa phương 3 miền (U036)
  private readonly knowledgeBase: LocalCulinaryKnowledge[] = [
    {
      id: 'kb-pho-ha-noi',
      dishName: 'Phở Bò Hà Nội',
      region: 'NORTH',
      origin: 'Hà Nội & Nam Định',
      story: 'Phở là linh hồn ẩm thực Hà Thành với nước dùng ninh từ xương ống bò trong 12 tiếng, dậy mùi hoa hồi, thảo quả và quế.',
      keyIngredients: ['Bánh phở tươi', 'Bắp bò', 'Nạm gầu', 'Hành hoa', 'Nước dùng trong vắt'],
      flavorProfile: 'Thanh ngọt tự nhiên từ tủy xương, đậm đà, thơm thảo mộc dịu nhẹ',
      suitableOccasions: ['Bữa sáng', 'Thời tiết se lạnh', 'Ăn nhẹ buổi tối'],
    },
    {
      id: 'kb-bun-cha-ha-noi',
      dishName: 'Bún Chả Hà Nội',
      region: 'NORTH',
      origin: 'Kinh kỳ Thăng Long',
      story: 'Món ăn từng chinh phục đầu bếp Anthony Bourdain và Tổng thống Obama, chả băm nướng than hoa thơm nức mũi chấm nước mắm đu đủ chua ngọt.',
      keyIngredients: ['Thịt ba chỉ nướng', 'Chả băm lá lốt', 'Bún sợi nhỏ', 'Đu đủ ngâm', 'Rau kinh giới'],
      flavorProfile: 'Chua ngọt thanh tao, chả nướng xém cạnh ngậy béo',
      suitableOccasions: ['Bữa trưa công sở', 'Tiệc nhẹ'],
    },
    {
      id: 'kb-bun-bo-hue',
      dishName: 'Bún Bò Huế',
      region: 'CENTRAL',
      origin: 'Cố đô Huế',
      story: 'Đỉnh cao hương vị xứ Thần Kinh với sợi bún to, nước dùng thơm nồng mắm ruốc hòa quyện sả tươi và ớt chưng cay xé lưỡi.',
      keyIngredients: ['Bắp bò hoa', 'Chả cua Huế', 'Tiết luộc', 'Gân bò', 'Mắm ruốc Huế', 'Sả tươi'],
      flavorProfile: 'Cay nồng, đậm đà vị mắm ruốc, thơm lừng mùi sả',
      suitableOccasions: ['Bữa sáng', 'Bữa trưa gia đình', 'Người thích ăn cay'],
    },
    {
      id: 'kb-cao-lau-hoi-an',
      dishName: 'Cao Lầu Hội An',
      region: 'CENTRAL',
      origin: 'Phố cổ Hội An (Quảng Nam)',
      story: 'Sợi mì trứ danh làm từ gạo ngâm tro củi cù lao Chàm và nước giếng Bá Lễ nghìn năm, ăn kèm xá xíu thơm mềm và tép mỡ giòn rụm.',
      keyIngredients: ['Sợi cao lầu màu tro', 'Thịt xá xíu ướp ngũ vị', 'Tép mỡ giòn', 'Rau Trà Quế'],
      flavorProfile: 'Sần sật, đậm vị xá xíu, béo bùi từ tép mỡ',
      suitableOccasions: ['Bữa trưa', 'Khám phá ẩm thực di sản'],
    },
    {
      id: 'kb-mi-quang',
      dishName: 'Mì Quảng',
      region: 'CENTRAL',
      origin: 'Xứ Quảng',
      story: 'Sợi mì vàng óng màu nghệ, chan xăm xắp nước nhưn tôm thịt đậm đà, rắc đậu phộng rang giòn và bánh tráng mè nướng.',
      keyIngredients: ['Mì gạo vàng nghệ', 'Tôm đất', 'Thịt ba rọi', 'Trứng cút', 'Bánh tráng nướng', 'Đậu phộng'],
      flavorProfile: 'Đậm đà, béo ngậy, giòn rụm của bánh đa vỡ',
      suitableOccasions: ['Bữa trưa', 'Họp mặt cuối tuần'],
    },
    {
      id: 'kb-com-tam-sai-gon',
      dishName: 'Cơm Tấm Sài Gòn',
      region: 'SOUTH',
      origin: 'TP. Hồ Chí Minh',
      story: 'Biểu tượng ẩm thực đường phố phương Nam từ hạt tấm gạo gãy, sườn nướng mỡ hành óng ả, bì thính vàng giòn và chả trứng hấp thơm ngậy.',
      keyIngredients: ['Gạo tấm thơm', 'Sườn cốt lết ướp mật ong', 'Bì heo trộn thính', 'Chả trứng', 'Mỡ hành', 'Nước mắm kẹo'],
      flavorProfile: 'Chua cay mặn ngọt hài hòa, thơm nức mùi thịt nướng than',
      suitableOccasions: ['Bữa sáng', 'Bữa trưa', 'Bữa tối'],
    },
    {
      id: 'kb-lau-mam-mien-tay',
      dishName: 'Lẩu Mắm Miền Tây',
      region: 'SOUTH',
      origin: 'Đồng bằng Sông Cửu Long',
      story: 'Bản hòa tấu của đất rừng phương Nam với nước cốt mắm cá linh, cá sặc ăn cùng hơn 20 loại rau đồng nội hoa súng, điên điển, kèo nèo.',
      keyIngredients: ['Mắm cá linh', 'Mắm cá sặc', 'Tôm sú', 'Mực tươi', 'Cà tím', 'Bông điên điển', 'Rau nhút'],
      flavorProfile: 'Đậm đà nồng nàn vị mắm, ngọt thanh từ cá tôm đồng',
      suitableOccasions: ['Tiệc gia đình', 'Mâm cỗ liên hoan', 'Tiệc bạn bè'],
    },
  ];

  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------------------
  // U038: AI GUARDRAILS & POLICY & RATE LIMITING
  // ----------------------------------------------------------------------------

  /**
   * Kiểm tra nội dung câu hỏi có an toàn và nằm trong phạm vi ẩm thực hay không
   */
  private checkGuardrails(userQuery: string, userId: string): GuardrailCheckResult {
    // 1. Kiểm tra Rate Limiting (20 câu/giờ)
    const now = Date.now();
    const userLimit = this.userRateLimits.get(userId) || { count: 0, resetAt: now + 3600000 };

    if (now > userLimit.resetAt) {
      userLimit.count = 0;
      userLimit.resetAt = now + 3600000;
    }

    if (userLimit.count >= 20) {
      return {
        isAllowed: false,
        violationReason: 'RATE_LIMIT_EXCEEDED',
        fallbackMessage:
          'Bạn đã vượt quá giới hạn 20 câu hỏi tư vấn AI trong 1 giờ. Vui lòng quay lại sau ít phút để bảo đảm tài nguyên hệ thống!',
      };
    }
    userLimit.count++;
    this.userRateLimits.set(userId, userLimit);

    // 2. Chặn từ khóa nhạy cảm / công kích / chính trị / phi ẩm thực
    const lower = userQuery.toLowerCase();
    const forbiddenKeywords = [
      'chính trị',
      'bầu cử',
      'đánh bạc',
      'lừa đảo',
      'ma túy',
      'tự tử',
      'hack',
      'tiền ảo',
      'bitcoin',
      'chứng khoán',
    ];

    for (const kw of forbiddenKeywords) {
      if (lower.includes(kw)) {
        return {
          isAllowed: false,
          violationReason: 'OUT_OF_SCOPE_TOPIC',
          fallbackMessage:
            'Xin lỗi bạn! Tôi là DineGo AI Local Culinary Guide — Trợ lý chuyên sâu về ẩm thực địa phương Việt Nam. Tôi chỉ có thể tư vấn các món ngon, nhà hàng và đặc sản ẩm thực.',
        };
      }
    }

    return { isAllowed: true };
  }

  // ----------------------------------------------------------------------------
  // U036: RAG RETRIEVAL TỪ LOCAL KNOWLEDGE BASE
  // ----------------------------------------------------------------------------

  /**
   * Truy xuất tri thức ẩm thực địa phương phù hợp nhất với câu hỏi
   */
  private retrieveLocalKnowledge(query: string): LocalCulinaryKnowledge[] {
    const lower = query.toLowerCase();
    const scored = this.knowledgeBase.map((kb) => {
      let score = 0;
      if (lower.includes(kb.dishName.toLowerCase())) score += 10;

      // Khớp từng từ khóa trong tên món (ví dụ: "Phở" và "Hà Nội" hoặc "Cơm" và "Sài Gòn")
      const words = kb.dishName.toLowerCase().split(/\s+/);
      const matched = words.filter((w) => w.length > 2 && lower.includes(w));
      if (matched.length >= 2) score += 8;

      if ((lower.includes('bắc') || lower.includes('hà nội')) && kb.region === 'NORTH') score += 5;
      if ((lower.includes('trung') || lower.includes('huế')) && kb.region === 'CENTRAL') score += 5;
      if ((lower.includes('nam') || lower.includes('sài gòn')) && kb.region === 'SOUTH') score += 5;
      for (const ing of kb.keyIngredients) {
        if (lower.includes(ing.toLowerCase())) score += 2;
      }
      return { kb, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.filter((s) => s.score > 0).slice(0, 2).map((s) => s.kb);
  }

  // ----------------------------------------------------------------------------
  // U037: PARSE NATURAL INTENT
  // ----------------------------------------------------------------------------

  /**
   * Phân tích câu hỏi tự nhiên thành bộ lọc tìm kiếm có cấu trúc
   */
  parseNaturalIntent(query: string): ParsedLocalIntent {
    const lower = query.toLowerCase();
    const intent: ParsedLocalIntent = { keywords: [] };

    if (lower.includes('miền bắc') || lower.includes('hà nội')) intent.region = 'NORTH';
    else if (lower.includes('miền trung') || lower.includes('huế') || lower.includes('hội an')) intent.region = 'CENTRAL';
    else if (lower.includes('miền nam') || lower.includes('sài gòn') || lower.includes('miền tây')) intent.region = 'SOUTH';

    // Parse ngân sách (ví dụ: "dưới 100k", "150k", "200.000")
    const budgetMatch = lower.match(/(dưới|khoảng|tầm)?\s*(\d+)\s*(k|nghìn|ngàn|vnd|vnđ)/);
    if (budgetMatch && budgetMatch[2]) {
      const num = parseInt(budgetMatch[2], 10);
      intent.maxBudget = num < 1000 ? num * 1000 : num;
    }

    // Parse số người (ví dụ: "cho 2 người", "4 người", "nhóm 5 người")
    const partyMatch = lower.match(/(cho|nhóm|tụi mình)?\s*(\d+)\s*người/);
    if (partyMatch && partyMatch[2]) {
      intent.partySize = parseInt(partyMatch[2], 10);
    }

    if (lower.includes('bún') || lower.includes('phở') || lower.includes('cơm') || lower.includes('lẩu')) {
      intent.keywords.push(lower.match(/(bún|phở|cơm|lẩu|mì|bánh xèo)/)?.[0] || '');
    }

    return intent;
  }

  // ----------------------------------------------------------------------------
  // U034 & U035: CHATBOT AI VÀ GỢI Ý MÓN KÈM DEEP LINK
  // ----------------------------------------------------------------------------

  async chat(
    user: AuthenticatedUser,
    dto: SendChatMessageDto,
  ): Promise<{
    session: ChatSession;
    reply: ChatMessage;
    recommendations: CulinaryRecommendation[];
  }> {
    // 1. Kiểm tra Guardrail an toàn & Rate Limiting (U038)
    const guardrail = this.checkGuardrails(dto.message, user.id);
    if (!guardrail.isAllowed) {
      throw new BadRequestException(guardrail.fallbackMessage);
    }

    // 2. Lấy hoặc tạo Chat Session (U034)
    let session: ChatSession;
    if (dto.sessionId && this.sessions.has(dto.sessionId)) {
      session = this.sessions.get(dto.sessionId)!;
    } else {
      const sessionId = crypto.randomUUID();
      session = {
        id: sessionId,
        userId: user.id,
        title: dto.message.slice(0, 30) + '...',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.sessions.set(sessionId, session);
    }

    // Lưu tin nhắn của khách
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: dto.message.trim(),
      createdAt: new Date(),
    };
    session.messages.push(userMsg);

    // 3. RAG: Truy xuất tri thức ẩm thực địa phương (U036)
    const retrievedKBs = this.retrieveLocalKnowledge(dto.message);
    const intent = this.parseNaturalIntent(dto.message);

    // 4. Tìm kiếm các món ăn thực tế có trên sàn DineGo phù hợp với intent (U035)
    let matchingDishes = await this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        ...(intent.maxBudget ? { basePrice: { lte: intent.maxBudget } } : {}),
      },
      include: {
        merchant: true,
      },
      take: 3,
    });

    const recommendations: CulinaryRecommendation[] = matchingDishes.map((dish) => ({
      menuItemId: dish.id,
      menuItemName: dish.name,
      restaurantName: dish.merchant?.name || 'Nhà Hàng DineGo',
      price: Number(dish.basePrice),
      reason: `Món ăn đặc sản địa phương chế biến chuẩn vị, giá cả hợp lý ${Number(dish.basePrice).toLocaleString()} VNĐ.`,
      deepLink: `/restaurants/${dish.merchant?.slug || 'menu'}?item=${dish.id}`,
    }));

    // 5. Tổng hợp câu trả lời từ AI
    let replyContent = '';
    if (retrievedKBs.length > 0) {
      const kb = retrievedKBs[0];
      replyContent = `DineGo xin giới thiệu đến bạn **${kb.dishName}** (${kb.origin})!\n\n` +
        `📖 **Câu chuyện món ăn:** ${kb.story}\n` +
        `✨ **Hương vị đặc trưng:** ${kb.flavorProfile}\n` +
        `🌿 **Nguyên liệu cốt lõi:** ${kb.keyIngredients.join(', ')}.\n\n` +
        `Dưới đây là một số quán ăn chuẩn vị đang mở cửa phục vụ món này trên sàn DineGo:`;
    } else {
      replyContent =
        `Chào bạn! Dựa trên yêu cầu của bạn, DineGo gợi ý các món ngon địa phương được nhiều thực khách đánh giá cao và phù hợp nhất với khẩu vị của bạn. Hãy chọn món bên dưới để đặt ngay nhé!`;
    }

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: replyContent,
      recommendations,
      createdAt: new Date(),
    };
    session.messages.push(assistantMsg);
    session.updatedAt = new Date();

    return {
      session,
      reply: assistantMsg,
      recommendations,
    };
  }

  // ----------------------------------------------------------------------------
  // U037: TÌM KIẾM BẰNG NGÔN NGỮ TỰ NHIÊN
  // ----------------------------------------------------------------------------

  async naturalLanguageSearch(dto: NaturalLanguageSearchDto) {
    const intent = this.parseNaturalIntent(dto.query);
    const keywords = intent.keywords;

    const dishes = await this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        ...(intent.maxBudget ? { basePrice: { lte: intent.maxBudget } } : {}),
      },
      include: {
        merchant: true,
      },
      take: 10,
    });

    return {
      query: dto.query,
      parsedIntent: intent,
      resultsCount: dishes.length,
      dishes: dishes.map((d) => ({
        id: d.id,
        name: d.name,
        price: Number(d.basePrice),
        merchantName: d.merchant.name,
        merchantSlug: d.merchant.slug,
        isOpen: d.merchant.isOpen,
      })),
    };
  }

  async getSessionHistory(sessionId: string, userId: string): Promise<ChatSession> {
    const session = this.sessions.get(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException('Không tìm thấy lịch sử phiên chat này');
    }
    return session;
  }
}
