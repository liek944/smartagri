/**
 * API client — single seam between UI and server.
 * Owns URL construction, _id normalization, error handling, and response typing.
 */

import { Product, Order, User, UserRole, Conversation, ChatMessage } from '../types';

// --- Error type ---

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

// --- Internal helpers ---

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await res.json().catch(() => ({ error: 'Request failed' }));

  if (!res.ok) {
    throw new ApiError(res.status, data.error || 'Request failed');
  }

  return data as T;
}

/** Normalize MongoDB _id → id on a single record */
function normalizeId<T extends Record<string, any>>(item: T): T & { id: string } {
  return { ...item, id: item._id || item.id || '' };
}

/** Normalize MongoDB _id → id on an array */
function normalizeIds<T extends Record<string, any>>(items: T[]): (T & { id: string })[] {
  return items.map(normalizeId);
}

// --- Public API ---

export const api = {
  products: {
    list: (): Promise<Product[]> =>
      request<any[]>('/products').then(normalizeIds),

    create: (data: Omit<Product, 'id'>): Promise<Product> =>
      request<any>('/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(normalizeId),

    update: (id: string, data: Partial<Product>): Promise<Product> =>
      request<any>(`/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }).then(normalizeId),

    delete: (id: string): Promise<{ success: boolean }> =>
      request<{ success: boolean }>(`/products/${id}`, {
        method: 'DELETE',
      }),
  },

  auth: {
    login: (email: string, password: string): Promise<User> =>
      request<User>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    register: (data: {
      email: string;
      username: string;
      password: string;
      fullName: string;
      role: string;
    }): Promise<User> =>
      request<User>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  users: {
    get: (id: string): Promise<User> =>
      request<User>(`/users/${id}`),

    save: (user: User): Promise<User> =>
      request<User>('/users', {
        method: 'POST',
        body: JSON.stringify(user),
      }),
  },

  orders: {
    list: (userId: string): Promise<Order[]> =>
      request<any[]>(`/orders/${userId}`).then(normalizeIds),

    create: (data: Omit<Order, 'id'>): Promise<Order> =>
      request<any>('/orders', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(normalizeId),
  },

  conversations: {
    list: (userId: string): Promise<Conversation[]> =>
      request<any[]>(`/conversations/${userId}`).then(normalizeIds),

    create: (data: {
      participants: string[];
      participantNames: Record<string, string>;
      productId: string;
      productName: string;
    }): Promise<Conversation> =>
      request<any>('/conversations', {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(normalizeId),
  },

  messages: {
    list: (conversationId: string): Promise<ChatMessage[]> =>
      request<ChatMessage[]>(`/messages/${conversationId}`),
  },
};
