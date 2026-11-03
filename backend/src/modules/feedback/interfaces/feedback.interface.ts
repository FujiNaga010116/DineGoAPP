export interface ReviewReply {
  merchantId: string;
  merchantName: string;
  replyContent: string;
  repliedAt: Date;
}

export interface ReviewItem {
  id: string;
  orderId: string;
  userId: string;
  customerName: string;
  merchantId: string;
  rating: number; // 1 to 5
  comment: string;
  images?: string[];
  reply?: ReviewReply;
  createdAt: Date;
}

export type ComplaintStatus =
  | 'OPEN'
  | 'INVESTIGATING'
  | 'RESOLVED_REFUND'
  | 'RESOLVED_COMPENSATE'
  | 'REJECTED';

export type IssueType =
  | 'MISSING_ITEMS'
  | 'LATE_DELIVERY'
  | 'FOOD_QUALITY'
  | 'WRONG_ITEMS'
  | 'OTHER';

export interface ComplaintItem {
  id: string;
  complaintCode: string;
  orderId: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  merchantId: string;
  issueType: IssueType;
  description: string;
  evidenceImages?: string[];
  status: ComplaintStatus;
  adminResolutionNotes?: string;
  compensationAmount?: number;
  resolvedAt?: Date;
  createdAt: Date;
}

