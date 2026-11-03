export interface CulinaryRecommendation {
  menuItemId?: string;
  menuItemName: string;
  restaurantName: string;
  price: number;
  reason: string;
  deepLink: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  recommendations?: CulinaryRecommendation[];
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LocalCulinaryKnowledge {
  id: string;
  dishName: string;
  region: 'NORTH' | 'CENTRAL' | 'SOUTH';
  origin: string;
  story: string;
  keyIngredients: string[];
  flavorProfile: string;
  suitableOccasions: string[];
}

export interface GuardrailCheckResult {
  isAllowed: boolean;
  violationReason?: string;
  fallbackMessage?: string;
}

export interface ParsedLocalIntent {
  region?: 'NORTH' | 'CENTRAL' | 'SOUTH';
  maxBudget?: number;
  partySize?: number;
  dishType?: string;
  flavor?: string;
  keywords: string[];
}

