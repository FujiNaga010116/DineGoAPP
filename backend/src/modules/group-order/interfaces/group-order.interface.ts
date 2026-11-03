export interface GroupOrderItemTopping {
  toppingId: string;
  name: string;
  price: number;
}

export interface GroupOrderItem {
  id: string;
  memberId: string;
  memberName: string;
  menuItemId: string;
  menuItemName: string;
  unitPrice: number;
  quantity: number;
  toppings: GroupOrderItemTopping[];
  note?: string;
  subtotal: number;
}

export interface GroupMember {
  id: string;
  name: string;
  userId?: string;
  isHost: boolean;
  joinedAt: Date;
}

export type GroupOrderStatus = 'OPEN' | 'LOCKED' | 'CHECKED_OUT' | 'CANCELLED';

export interface GroupOrderRoom {
  id: string;
  roomCode: string;
  roomName: string;
  hostUserId: string;
  hostName: string;
  merchantId: string;
  merchantName: string;
  status: GroupOrderStatus;
  createdAt: Date;
  members: GroupMember[];
  items: GroupOrderItem[];
}

export interface MemberBillShare {
  memberId: string;
  memberName: string;
  itemSubtotal: number;
  allocatedShipping: number;
  totalToPay: number;
  itemCount: number;
  itemNames: string[];
}

export interface BillSplitResult {
  roomCode: string;
  splitType: 'BY_ITEM' | 'EQUAL';
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  memberCount: number;
  shares: MemberBillShare[];
}

