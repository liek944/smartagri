export type UserRole = 'buyer' | 'farmer' | 'artisan' | 'admin';

export interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: UserRole;
  location: string;
  joinedDate: string;
  deliveryLocation?: string;
  phoneNumber?: string;
  isActive?: boolean;
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
  rating?: number;
  reviewsCount?: number;
}

export interface Review {
  id: string;
  _id?: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
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
  status: 'pending' | 'confirmed' | 'dispatched' | 'out_for_delivery' | 'delivered' | 'cancelled';
  orderDate: string;
  deliveryLocation?: string;
  phoneNumber?: string;
  paymentDetails?: any;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  audio?: string;
  image?: string;
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
