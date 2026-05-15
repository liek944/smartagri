export type UserRole = 'buyer' | 'farmer' | 'artisan' | 'admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  location: string;
  joinedDate: string;
}

export interface Product {
  id: string;
  _id?: string;
  name: string;
  price: number;
  stock: number;
  sold: number;
  category: 'agriculture' | 'craft';
  producer: string;
  producerId: string;
  image: string;
  description: string;
  pricePerKg?: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Order {
  id: string;
  _id?: string;
  userId: string;
  userName: string;
  items: CartItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: 'gcash' | 'credit' | 'cod';
  status: 'pending' | 'paid' | 'processing' | 'completed' | 'cancelled';
  orderDate: string;
  deliveryLocation?: string;
  paymentDetails?: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  audio?: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  _id?: string;
  participants: string[]; // [buyerId, sellerId]
  participantNames: { [uid: string]: string };
  lastMessage?: string;
  lastMessageTimestamp?: string;
  productId?: string;
  productName?: string;
}
