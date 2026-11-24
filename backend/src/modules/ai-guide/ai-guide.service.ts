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
import {
  NaturalLanguageSearchDto,
  SendChatMessageDto,
  UpsertKnowledgeDto,
} from './dto/chat-message.dto.js';
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

  // ----------------------------------------------------------------------------
  // U036: QUẢN TRỊ CƠ SỞ TRI THỨC ẨM THỰC ĐỊA PHƯƠNG (RAG KNOWLEDGE BASE CRUD)
  // ----------------------------------------------------------------------------

  getAllKnowledge(region?: 'NORTH' | 'CENTRAL' | 'SOUTH'): LocalCulinaryKnowledge[] {
    if (region) {
      return this.knowledgeBase.filter((kb) => kb.region === region);
    }
    return this.knowledgeBase;
  }

  createKnowledge(dto: UpsertKnowledgeDto): LocalCulinaryKnowledge {
    const newEntry: LocalCulinaryKnowledge = {
      id: `kb-${Date.now()}`,
      dishName: dto.dishName.trim(),
      region: dto.region,
      origin: dto.origin.trim(),
      story: dto.story.trim(),
      keyIngredients: dto.keyIngredients,
      flavorProfile: dto.flavorProfile.trim(),
      suitableOccasions: dto.suitableOccasions,
    };
    this.knowledgeBase.unshift(newEntry);
    this.logger.log(`[RAG Knowledge Base] Đã thêm mục tri thức mới: ${newEntry.dishName} (${newEntry.region})`);
    return newEntry;
  }

  updateKnowledge(id: string, dto: UpsertKnowledgeDto): LocalCulinaryKnowledge {
    const idx = this.knowledgeBase.findIndex((kb) => kb.id === id);
    if (idx === -1) {
      throw new NotFoundException('Không tìm thấy mục tri thức ẩm thực');
    }
    const updated: LocalCulinaryKnowledge = {
      id,
      dishName: dto.dishName.trim(),
      region: dto.region,
      origin: dto.origin.trim(),
      story: dto.story.trim(),
      keyIngredients: dto.keyIngredients,
      flavorProfile: dto.flavorProfile.trim(),
      suitableOccasions: dto.suitableOccasions,
    };
    this.knowledgeBase[idx] = updated;
    this.logger.log(`[RAG Knowledge Base] Đã cập nhật mục tri thức: ${updated.dishName}`);
    return updated;
  }

  deleteKnowledge(id: string): { deleted: boolean; id: string } {
    const idx = this.knowledgeBase.findIndex((kb) => kb.id === id);
    if (idx === -1) {
      throw new NotFoundException('Không tìm thấy mục tri thức ẩm thực cần xóa');
    }
    const removed = this.knowledgeBase.splice(idx, 1)[0];
    this.logger.log(`[RAG Knowledge Base] Đã xóa mục tri thức: ${removed.dishName}`);
    return { deleted: true, id };
  }

  async widgetChat(body: {
    message: string;
    userId?: string;
    userEmail?: string;
    sessionId?: string;
    history?: Array<{ role: 'user' | 'assistant'; text: string; recommendedIds?: string[] }>;
  }) {
    const rawMsg = String(body?.message || '').trim();
    if (!rawMsg) {
      throw new BadRequestException('Tin nhắn không được để trống');
    }
    const lower = rawMsg.toLowerCase();

    // 1. Guardrail check (BR-30)
    const blockedKeywords = ['hack', 'sql injection', 'drop table', 'password', 'chính trị', 'cá độ'];
    if (blockedKeywords.some((k) => lower.includes(k))) {
      return {
        sessionId: body.sessionId || `wchat-${Date.now()}`,
        reply:
          'Xin lỗi, trợ lý DineGo chỉ hỗ trợ tư vấn ẩm thực, tìm quán ăn, đặt mâm cỗ sự kiện, mã giảm giá và hỗ trợ đơn hàng/khiếu nại trên sàn.',
        recommendations: [],
        quickActions: [{ label: 'Xem món ngon', tab: 'home' }],
        llmProvider: 'SQL_RAG',
      };
    }

    // 2. Query SQL Server RAG Knowledge Base + Admin-trained System Prompt
    let kbRows: Array<{ id: string; content: string; source: string }> = [];
    let customSystemPrompt = '';
    try {
      const allKb = await this.prisma.$queryRawUnsafe<Array<{ id: string; content: string; source: string }>>(
        `SELECT TOP 10 id, content, source FROM knowledge_base_vectors ORDER BY created_at DESC`,
      );
      for (const row of allKb) {
        if (row.source === '__SYSTEM_PROMPT__') {
          customSystemPrompt = row.content;
        } else {
          kbRows.push(row);
        }
      }
    } catch {}

    const matchedKb = kbRows.filter((kb) => {
      const words = lower.split(/\s+/).filter((w) => w.length >= 2);
      const hay = `${kb.source} ${kb.content}`.toLowerCase();
      return words.some((w) => hay.includes(w));
    });

    // 3. Parse budget if user mentions e.g. "60k", "65000", "dưới 70.000"
    let maxBudget: number | null = null;
    const kMatch = lower.match(/(\d{2,3})\s*k/);
    const vndMatch = lower.match(/(\d{2,3})[.,]?000/);
    if (kMatch) {
      maxBudget = Number(kMatch[1]) * 1000;
    } else if (vndMatch) {
      maxBudget = Number(vndMatch[1]) * 1000;
    }

    // 4. Query real MenuItems + Merchants from SQL Server
    const dbDishes = await this.prisma.menuItem.findMany({
      where: {
        isAvailable: true,
        isActive: true,
        ...(maxBudget ? { basePrice: { lte: maxBudget } } : {}),
      },
      include: {
        merchant: {
          select: { id: true, name: true, slug: true, address: true, rating: true, isActive: true },
        },
      },
      take: 40,
    });

    const catalogDishes = dbDishes
      .filter((d) => d.merchant?.isActive !== false)
      .map((d) => ({
        id: d.id,
        name: d.name,
        price: Number(d.basePrice),
        description: d.description || 'Món ăn được thực khách đánh giá cao trên DineGo',
        merchantId: d.merchant.id,
        merchantSlug: d.merchant.slug,
        merchantName: d.merchant.name,
        rating: Number(d.merchant?.rating || 4.8),
      }));

    // Track dish IDs already recommended in previous turns
    const historyList = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const previouslyRecommendedIds = new Set<string>();
    for (const h of historyList) {
      if (Array.isArray(h.recommendedIds)) {
        for (const id of h.recommendedIds) previouslyRecommendedIds.add(id);
      }
    }

    const stopWords = new Set([
      'có', 'cho', 'tôi', 'mình', 'bạn', 'xem', 'đang', 'với', 'nào', 'gì',
      'được', 'không', 'của', 'và', 'nhé', 'nha', 'này', 'kia', 'đi', 'rồi',
      'luôn', 'làm', 'cần', 'muốn', 'giúp', 'mã', 'đơn', 'hàng', 'giảm', 'giá',
    ]);
    const scoredDishes = catalogDishes
      .map((d) => {
        const hay = `${d.name} ${d.description} ${d.merchantName}`.toLowerCase();
        const words = lower
          .split(/\s+/)
          .map((w) => w.replace(/[^\p{L}\p{N}]/gu, ''))
          .filter((w) => w.length >= 2 && !stopWords.has(w));
        const hits = words.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
        return { dish: d, hits };
      })
      .sort((a, b) => b.hits - a.hits || a.dish.price - b.dish.price);

    const wantsAnother =
      lower.includes('món khác') ||
      lower.includes('đổi món') ||
      lower.includes('khác đi') ||
      lower.includes('cũ vậy');
    const wantsOneOnly =
      lower.includes('1 món') || lower.includes('một món') || lower.includes('duy nhất');
    const fallbackLimit = wantsOneOnly ? 1 : 3;

    const candidatePool = wantsAnother
      ? scoredDishes.filter((s) => !previouslyRecommendedIds.has(s.dish.id))
      : scoredDishes;
    const effectivePool = candidatePool.length > 0 ? candidatePool : scoredDishes;
    const fallbackDishes = (effectivePool.some((s) => s.hits > 0)
      ? effectivePool.filter((s) => s.hits > 0).slice(0, fallbackLimit)
      : effectivePool.slice(0, fallbackLimit)
    ).map((s) => s.dish);

    // 4.5. Query user's recent orders & active promos from SQL Server
    let userOrders: Array<{ orderNumber: string; status: string; finalTotal: number; merchantName: string }> = [];
    const resolvedUserId = await this.resolveDbUserId(body.userId, body.userEmail);
    if (resolvedUserId) {
      try {
        const dbOrders = await this.prisma.order.findMany({
          where: { userId: resolvedUserId },
          include: { merchant: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 3,
        });
        userOrders = dbOrders.map((o) => ({
          orderNumber: o.orderNumber,
          status: o.status,
          finalTotal: Number(o.finalTotal),
          merchantName: o.merchant?.name || 'Nhà hàng DineGo',
        }));
      } catch {}
    }

    const activePromos = await this.prisma.promotion.findMany({
      where: { isActive: true },
      take: 5,
      orderBy: { createdAt: 'desc' },
    });

    // 5. Intent shortcuts for quick navigation actions + Real Gemini AI Orchestration
    let reply = '';
    const quickActions: Array<{ label: string; tab: string }> = [];
    let selectedRecommendations: typeof catalogDishes = [];
    let llmProvider: 'GEMINI' | 'OPENAI' | 'SQL_RAG' = 'SQL_RAG';

    if (lower.includes('khiếu nại') || lower.includes('hoàn tiền') || lower.includes('bồi thường')) {
      quickActions.push({ label: 'Mở Đơn hàng của tôi', tab: 'orders' });
      quickActions.push({ label: 'Xem Ví hoàn tiền', tab: 'customer-profile' });
    } else if (lower.includes('voucher') || lower.includes('giảm giá') || lower.includes('khuyến mãi')) {
      quickActions.push({ label: 'Đi Săn Voucher ngay', tab: 'vouchers' });
    } else if (lower.includes('mâm cỗ') || lower.includes('đặt tiệc') || lower.includes('cỗ')) {
      quickActions.push({ label: 'Mở Đặt Mâm Cỗ', tab: 'catering' });
    } else if (lower.includes('đơn của tôi') || lower.includes('đơn hàng') || lower.includes('kiểm tra đơn')) {
      quickActions.push({ label: 'Mở Đơn hàng', tab: 'orders' });
      quickActions.push({ label: 'Theo dõi giao hàng', tab: 'tracking' });
    }

    const geminiKey = process.env.GEMINI_API_KEY?.trim();
    if (geminiKey) {
      const baseSystemPrompt =
        customSystemPrompt ||
        'Bạn là Trợ lý AI thông minh & CSKH của sàn đặt đồ ăn DineGo. Phong cách: thân thiện, ngắn gọn, chính xác, xưng hô "mình - bạn".\n' +
          'Quy tắc bắt buộc:\n' +
          '1. Chỉ gợi ý món ăn có thật trong danh sách <menu_catalog>, tuyệt đối không bịa món.\n' +
          '2. Nếu khách yêu cầu số lượng cụ thể (VD: "1 món thôi", "2 món"), trả về đúng số lượng đó trong recommendedIds.\n' +
          '3. Nếu khách nói "món khác", "đổi món", tuyệt đối KHÔNG chọn lại các ID trong previouslyRecommendedIds.\n' +
          '4. Nếu khách chỉ chào hỏi (VD: "xin chào") hoặc hỏi đơn hàng/voucher/khiếu nại không cần chọn món thì để recommendedIds = [].\n' +
          '5. Tuyệt đối KHÔNG bịa rằng bạn đã gửi email, SMS hay thông tin tài khoản ngân hàng cho khách; nếu khách cần hỗ trợ đơn hàng hoặc khiếu nại ngoài phạm vi tư vấn, hãy hướng dẫn khách vào mục "Đơn hàng" hoặc gửi khiếu nại trên hệ thống.';

      const contextPayload = {
        knowledgeBase: kbRows.map((k) => `[${k.source}] ${k.content}`),
        menuCatalog: catalogDishes.slice(0, 25).map((d) => ({
          id: d.id,
          name: d.name,
          price: d.price,
          merchant: d.merchantName,
        })),
        activeVouchers: activePromos.map((p) => ({
          code: p.code,
          name: p.name,
          minOrder: Number(p.minOrderValue),
        })),
        userRecentOrders: userOrders,
        previouslyRecommendedIds: Array.from(previouslyRecommendedIds),
        conversationHistory: historyList.map((h) => ({
          role: h.role,
          text: h.text,
          recommendedIds: h.recommendedIds || [],
        })),
      };

      const fullPrompt = `${baseSystemPrompt}

<context_data>
${JSON.stringify(contextPayload)}
</context_data>

Tin nhắn mới nhất của khách hàng: "${rawMsg}"

Hãy trả về DUY NHẤT một JSON object hợp lệ đúng định dạng sau:
{
  "reply": "Câu trả lời tự nhiên bằng tiếng Việt (có thể xuống dòng nhẹ)",
  "recommendedIds": ["id_mon_1"]
}`;

      const geminiModels = ['gemini-3.8-flash', 'gemini-3.5-flash'];
      for (const modelName of geminiModels) {
        if (reply) break;
        try {
          const gRes = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(geminiKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              signal: AbortSignal.timeout(6000),
              body: JSON.stringify({
                contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
                generationConfig: { responseMimeType: 'application/json' },
              }),
            },
          );
          if (gRes.ok) {
            const gData = (await gRes.json()) as any;
            const gRaw = gData?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (gRaw) {
              try {
                const parsed = JSON.parse(String(gRaw).trim());
                if (parsed?.reply) {
                  reply = String(parsed.reply).trim();
                  llmProvider = 'GEMINI';
                  const ids: string[] = Array.isArray(parsed.recommendedIds) ? parsed.recommendedIds : [];
                  selectedRecommendations = ids
                    .map((id) => catalogDishes.find((d) => d.id === id))
                    .filter((d): d is (typeof catalogDishes)[number] => Boolean(d));
                }
              } catch {
                reply = String(gRaw).trim();
                llmProvider = 'GEMINI';
              }
            }
          } else {
            const errTxt = await gRes.text();
            this.logger.warn(`Gemini (${modelName}) returned ${gRes.status}: ${errTxt.slice(0, 140)}`);
          }
        } catch (err) {
          this.logger.warn(`Gemini (${modelName}) error: ${(err as Error).message}`);
        }
      }
    }

    // Fast, accurate fallback when Gemini is unavailable/rate-limited
    if (!reply) {
      const asksVoucher =
        lower.includes('voucher') || lower.includes('giảm giá') || lower.includes('khuyến mãi') || lower.includes('mã giảm');
      const asksOrder =
        lower.includes('đơn hàng') || lower.includes('đơn của tôi') || lower.includes('kiểm tra đơn') || lower.includes('giao hàng');
      const asksComplaint =
        lower.includes('khiếu nại') || lower.includes('hoàn tiền') || lower.includes('bồi thường');
      const asksCatering =
        lower.includes('mâm cỗ') || lower.includes('đặt tiệc') || lower.includes('tiệc');

      if (asksVoucher) {
        if (activePromos.length > 0) {
          reply =
            'Hiện tại DineGo đang có các mã giảm giá sau:\n' +
            activePromos
              .map(
                (p) =>
                  `• **${p.code}** — ${p.name} (đơn tối thiểu ${Number(p.minOrderValue).toLocaleString('vi-VN')}đ)`,
              )
              .join('\n');
        } else {
          reply = 'Hiện tại chưa có mã giảm giá nào đang hoạt động. Bạn có thể kiểm tra lại ở mục Săn Voucher nhé!';
        }
      } else if (asksOrder) {
        if (userOrders.length > 0) {
          reply =
            'Các đơn hàng gần nhất của bạn:\n' +
            userOrders
              .map((o) => `• **#${o.orderNumber}** (${o.merchantName}) — ${o.finalTotal.toLocaleString('vi-VN')}đ — ${o.status}`)
              .join('\n');
        } else {
          reply = 'Tài khoản của bạn hiện chưa có đơn hàng nào gần đây. Bạn có thể mở mục Đơn hàng để kiểm tra chi tiết.';
        }
      } else if (asksComplaint) {
        reply =
          'Nếu đơn hàng gặp sự cố, bạn hãy mở mục **Đơn hàng của tôi**, chọn đơn cần hỗ trợ và gửi **Khiếu nại** để được xử lý và hoàn tiền vào Ví hoàn tiền nhé!';
      } else if (asksCatering) {
        const cateringKb = kbRows.find((k) => k.content.toLowerCase().includes('cỗ') || k.content.toLowerCase().includes('mâm'));
        reply = cateringKb
          ? cateringKb.content
          : 'Bạn có thể mở mục **Đặt Mâm Cỗ** để chọn gói tiệc và đặt cọc trực tiếp theo số lượng mâm mong muốn nhé!';
      } else {
        const wantsFood =
          Boolean(maxBudget) ||
          wantsAnother ||
          wantsOneOnly ||
          scoredDishes.some((s) => s.hits > 0) ||
          ['ăn gì', 'món', 'quán', 'cơm', 'phở', 'bún', 'trà sữa', 'gợi ý'].some((k) => lower.includes(k));
        if (wantsFood && fallbackDishes.length > 0) {
          selectedRecommendations = fallbackDishes;
          reply = `Dưới đây là ${fallbackDishes.length} gợi ý món phù hợp trên DineGo:`;
        } else {
          reply =
            'Xin chào! Mình là Trợ lý AI của DineGo. Bạn muốn mình tìm món gì, kiểm tra đơn hàng hay xem mã giảm giá?';
        }
      }
    }

    // 6. Persist to SQL Server chat_sessions & chat_messages if userId resolves to a DB user
    let sessionId = body.sessionId || `wchat-${Date.now()}`;
    if (resolvedUserId) {
      try {
        await this.prisma.$executeRawUnsafe(
          `IF NOT EXISTS (SELECT 1 FROM chat_sessions WHERE id = @P1)
             INSERT INTO chat_sessions (id, user_id, title, created_at, updated_at)
             VALUES (@P1, @P2, @P3, GETDATE(), GETDATE())
           ELSE
             UPDATE chat_sessions SET updated_at = GETDATE() WHERE id = @P1`,
          sessionId,
          resolvedUserId,
          rawMsg.slice(0, 120),
        );
        const uMsgId = `cm-u-${Date.now()}`;
        const aMsgId = `cm-a-${Date.now() + 1}`;
        await this.prisma.$executeRawUnsafe(
          `INSERT INTO chat_messages (id, session_id, role, content, tokens, is_interrupted, created_at)
           VALUES (@P1, @P2, 'user', @P3, @P4, 0, GETDATE()), (@P5, @P2, 'assistant', @P6, @P7, 0, GETDATE())`,
          uMsgId,
          sessionId,
          rawMsg,
          rawMsg.length,
          aMsgId,
          reply,
          reply.length,
        );
      } catch (e) {
        this.logger.warn(`Could not log widget chat to SQL Server: ${(e as Error).message}`);
      }
    }

    return {
      sessionId,
      reply,
      recommendations: selectedRecommendations,
      quickActions,
      llmProvider,
    };
  }

  private async resolveDbUserId(userId?: string, email?: string): Promise<string | null> {
    if (!userId && !email) return null;
    try {
      if (userId) {
        const exact = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { id: true },
        });
        if (exact) return exact.id;
      }
      if (email) {
        const byEmail = await this.prisma.user.findUnique({
          where: { email: email.trim().toLowerCase() },
          select: { id: true },
        });
        if (byEmail) return byEmail.id;
      }
      // Only map the legacy quick-login mock ID u-user1-001 to customer@dinego.vn; never leak other accounts
      if (userId === 'u-user1-001') {
        const legacyCustomer = await this.prisma.user.findFirst({
          where: { email: 'customer@dinego.vn' },
          select: { id: true },
        });
        return legacyCustomer?.id ?? null;
      }
      return null;
    } catch {
      return null;
    }
  }

  async getWidgetSessions(userId: string, email?: string) {
    const resolvedUserId = await this.resolveDbUserId(userId, email);
    if (!resolvedUserId) return [];
    let rows: Array<any> = [];
    try {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT TOP 20
           cs.id,
           cs.title,
           cs.updated_at,
           (SELECT TOP 1 content FROM chat_messages cm WHERE cm.session_id = cs.id ORDER BY cm.created_at DESC) AS last_message
         FROM chat_sessions cs
         WHERE cs.user_id = @P1 AND cs.id NOT LIKE 'sup-%' AND LEFT(cs.title, 9) <> '[SUPPORT]'
         ORDER BY cs.updated_at DESC`,
        resolvedUserId,
      );
    } catch (e) {
      this.logger.warn(`getWidgetSessions error: ${(e as Error).message}`);
    }
    return rows.map((r) => ({
      id: r.id,
      title: r.title || 'Cuộc trò chuyện DineGo',
      lastMessage: r.last_message || '',
      updatedAt: r.updated_at
        ? new Date(r.updated_at).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
          })
        : '',
    }));
  }

  async getWidgetSessionMessages(sessionId: string) {
    let rows: Array<any> = [];
    try {
      rows = await this.prisma.$queryRawUnsafe(
        `SELECT id, role, content, created_at FROM chat_messages WHERE session_id = @P1 ORDER BY created_at ASC`,
        sessionId,
      );
    } catch (e) {
      this.logger.warn(`getWidgetSessionMessages error: ${(e as Error).message}`);
    }
    return rows.map((r) => ({
      id: r.id,
      sender: r.role === 'user' ? 'user' : 'ai',
      text: r.content,
      timestamp: r.created_at
        ? new Date(r.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
        : '',
    }));
  }
}
