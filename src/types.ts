export interface Shop {
  id: string;
  name: string;
  ownerId: string;
  members: string[];
  createdAt: any;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  reorderLevel: number;
  category: string;
  updatedAt: any;
}

export interface Sale {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  totalPrice: number;
  timestamp: any;
  sellerId: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  shops: string[];
}
