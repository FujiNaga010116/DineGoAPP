// ==============================================================================
// DineGo Backend — Cart Response Interfaces (Phase 5.1)
// ==============================================================================

export interface CartItemToppingResponse {
  id: string;
  toppingId: string;
  name: string;
  price: number;
  isAvailable: boolean;
  isActive: boolean;
}

export interface CartItemResponse {
  id: string;
  menuItemId: string;
  name: string;
  slug: string;
  imageUrl: string | null;
  basePrice: number;
  quantity: number;
  note: string | null;
  isAvailable: boolean;
  isActive: boolean;
  toppings: CartItemToppingResponse[];
  itemUnitPrice: number;
  itemSubtotal: number;
}

export interface CartMerchantResponse {
  id: string;
  name: string;
  slug: string;
  address: string;
  phoneNumber: string;
  logoUrl: string | null;
  isOpen: boolean;
  isActive: boolean;
}

export interface CartResponse {
  id: string | null;
  merchant: CartMerchantResponse | null;
  items: CartItemResponse[];
  summary: {
    totalItems: number;
    subtotal: number;
  };
}
