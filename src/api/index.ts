import { http } from './client';
import { tokens } from './tokens';
import { toMenuItem, toStore } from './adapters';
import type { MenuItem, Store } from '@/data';
import type { StoreTypeInfo } from '@/storeTypes';

export { ApiError, onSignedOut } from './client';
export { tokens } from './tokens';
export { API_ORIGIN, API_URL } from './config';

export type Vertical = 'FOOD' | 'RETAIL';
export type User = { id: string; email?: string; phone?: string; firstName?: string; lastName?: string; [k: string]: unknown };
export type Quote = {
  subtotal: number; deliveryFee: number; serviceFee: number; smallOrderFee: number; taxAmount: number; tip: number;
  discountTotal: number; walletUsed: number; total: number; etaMinutes?: number | null; distanceKm?: number | null;
  warnings?: string[]; lines?: { name: string; quantity: number; lineTotal: number }[];
};

export type LoginResult =
  | { step: 'done'; user: User }
  | { step: '2fa' | '2fa-setup'; tempToken: string };

async function finish(res: { accessToken: string; refreshToken?: string; user?: User }): Promise<User> {
  await tokens.set(res);
  return res.user ?? (await http<User>('/auth/me'));
}

export const api = {
  // ---------- auth ----------
  async login(identifier: string, password: string): Promise<LoginResult> {
    const res = await http('/auth/login', { method: 'POST', auth: false, body: { identifier, password, app: 'customer', deviceInfo: 'Forky mobile app' } });
    if (res.requires2fa) return { step: '2fa', tempToken: res.tempToken };
    if (res.requires2faSetup) return { step: '2fa-setup', tempToken: res.tempToken };
    return { step: 'done', user: await finish(res) };
  },
  async verify2fa(tempToken: string, code: string) {
    return finish(await http('/auth/2fa/verify', { method: 'POST', auth: false, body: { tempToken, code } }));
  },
  async register(body: Record<string, unknown>) {
    const res = await http('/auth/customer/register', { method: 'POST', auth: false, body });
    return res.accessToken ? finish(res) : null;
  },
  me: () => http<User>('/auth/me'),
  async logout() {
    await http('/auth/logout', { method: 'POST', body: { refreshToken: tokens.refresh } }).catch(() => null);
    await tokens.clear();
  },
  forgotPassword: (identifier: string) => http('/auth/forgot-password', { method: 'POST', auth: false, body: { identifier } }),
  resetPassword: (body: { identifier: string; code: string; newPassword: string }) => http('/auth/reset-password', { method: 'POST', auth: false, body }),

  // ---------- discovery (public) ----------
  async listStores(p: { vertical?: Vertical; storeType?: string; cuisine?: string; q?: string; lat?: number; lng?: number } = {}): Promise<Store[]> {
    // sort=distance: stores that deliver to the address first, then the rest — each group nearest first
    const res = await http('/public/stores', { auth: false, params: { sort: 'distance', ...p, limit: 50 } });
    return (res.data as any[]).map(toStore);
  },
  async getStore(slug: string, geo: { lat?: number; lng?: number } = {}): Promise<{ store: Store; items: MenuItem[] }> {
    const d = await http(`/public/restaurants/${slug}`, { auth: false, params: { ...geo, perCategory: 100 } });
    const store = toStore(d.restaurant);
    const items = (d.menu.categories as any[]).flatMap((c) => (c.items as any[]).map((i) => toMenuItem(i, store.id, c.name)));
    return { store, items };
  },
  async storesPage(p: { vertical?: Vertical; storeType?: string; cuisine?: string; q?: string; sort?: string; openNow?: boolean; fulfilment?: 'PICKUP' | 'DELIVERY'; lat?: number; lng?: number }, page = 1, limit = 12) {
    const res = await http('/public/stores', { auth: false, params: { ...p, sort: p.sort ?? 'distance', openNow: p.openNow ? true : undefined, page, limit } });
    return { items: (res.data as any[]).map(toStore), meta: res.meta as { page: number; limit: number; total: number; totalPages: number } };
  },
  async storeTypes(geo: { lat?: number; lng?: number } = {}): Promise<StoreTypeInfo[]> {
    const res = await http('/public/store-types', { auth: false, params: geo });
    return ((res?.data ?? res ?? []) as StoreTypeInfo[]).filter((t) => t.count > 0);
  },
  resolveZone: (lat: number, lng: number) => http<{ serviceable: boolean; city?: { name: string } | null; zone?: { name: string } | null }>('/public/zones/resolve', { auth: false, params: { lat, lng } }),
  banners: (placement = 'HOME') => http<any[]>('/public/banners', { auth: false, params: { placement } }),
  cuisines: () => http<any[]>('/public/cuisines', { auth: false }),
  home: (p: { vertical?: Vertical; lat?: number; lng?: number } = {}) => http('/public/home', { auth: false, params: p }),
  deals: () => http<any[]>('/public/deals', { auth: false }),
  search: (q: string, geo: { lat?: number; lng?: number } = {}) => http('/public/search', { auth: false, params: { q, ...geo, limit: 30 } }),

  // ---------- customer account ----------
  getProfile: () => http('/customer/profile'),
  updateProfile: (body: unknown) => http('/customer/profile', { method: 'PATCH', body }),
  listAddresses: () => http<any[]>('/customer/addresses'),
  addAddress: (body: unknown) => http('/customer/addresses', { method: 'POST', body }),
  listCards: () => http<any[]>('/customer/cards'),
  listFavorites: () => http('/customer/favorites'),
  addFavorite: (id: string) => http(`/customer/favorites/${id}`, { method: 'POST', body: {} }),
  removeFavorite: (id: string) => http(`/customer/favorites/${id}`, { method: 'DELETE' }),
  wallet: (params: { page?: number; limit?: number } = {}) => http('/customer/wallet', { params: { limit: 20, ...params } }),
  walletTopUpIntent: (amount: number) => http<{ clientSecret?: string; intentId?: string; publishableKey?: string; mock?: boolean }>('/customer/wallet/top-up-intent', { method: 'POST', body: { amount } }),
  walletTopUpConfirm: (paymentIntentId: string) => http('/customer/wallet/top-up/confirm', { method: 'POST', body: { paymentIntentId } }),
  redeemGiftCard: (code: string) => http('/customer/wallet/redeem-gift-card', { method: 'POST', body: { code } }),
  paymentsConfig: () => http<{ provider: string; mock: boolean; mode: string; publishableKey: string | null; walletEnabled: boolean; topUp: { min: number; max: number } }>('/public/payments/config', { auth: false }),
  setDefaultCard: (id: string) => http(`/customer/cards/${id}/default`, { method: 'POST', body: {} }),
  deleteCard: (id: string) => http(`/customer/cards/${id}`, { method: 'DELETE' }),
  cardSetupIntent: () => http<{ clientSecret: string; customerId: string; publishableKey?: string; mock?: boolean }>('/customer/cards/setup-intent', { method: 'POST', body: {} }),
  /** Prices the cart again on the server and creates the Stripe intent for the card part (total − wallet). */
  paymentIntent: (body: Record<string, unknown>) => http<{ required: boolean; mock?: boolean; intentId?: string; clientSecret?: string; amount: number; publishableKey?: string | null; status?: string; message?: string; quote?: { total: number; walletUsed: number; cardAmount: number } }>('/customer/payments/intent', { method: 'POST', body }),
  registerDevice: (body: { token: string; platform: 'ios' | 'android'; app: 'customer'; appVersion?: string }) => http('/notifications/devices', { method: 'POST', body }),
  async favoriteIds(): Promise<string[]> {
    const res = await http('/customer/favorites');
    return ((res?.data ?? res ?? []) as any[]).map((r) => r.id);
  },
  async favoriteStores(geo: { lat?: number; lng?: number } = {}): Promise<Store[]> {
    const res = await http('/customer/favorites', { params: geo });
    return ((res?.data ?? res ?? []) as any[]).map(toStore);
  },
  deleteAddress: (id: string) => http(`/customer/addresses/${id}`, { method: 'DELETE' }),
  setDefaultAddress: (id: string) => http(`/customer/addresses/${id}/default`, { method: 'POST', body: {} }),
  listNotifications: (params?: Record<string, unknown>) => http('/notifications', { params }),
  markNotificationRead: (id: string) => http(`/notifications/${id}/read`, { method: 'POST', body: {} }),
  markAllNotificationsRead: () => http('/notifications/read-all', { method: 'POST', body: {} }),
  unreadNotifications: () => http('/notifications/unread-count'),

  // ---------- cart, checkout & orders ----------
  syncCart: (b: { restaurantId: string; items: { menuItemId: string; quantity: number }[]; promoCode?: string | null }) =>
    http('/customer/cart/replace', { method: 'POST', body: { ...b, items: b.items.map((i) => ({ ...i, modifierOptionIds: [] })) } }),
  quote: (body: Record<string, unknown>) => http<Quote>('/customer/checkout/quote', { method: 'POST', body }),
  placeOrder: (body: Record<string, unknown>) => http<{ id: string; code?: string; status?: string }>('/customer/orders', { method: 'POST', body }),
  listOrders: (params?: Record<string, unknown>) => http('/customer/orders', { params: { limit: 50, ...params } }),
  getOrder: (id: string) => http(`/customer/orders/${id}`),
  tracking: (id: string) => http(`/orders/${id}/tracking`),
  /** refundTo: where the money goes back to: the payment method used (default) or the Forky wallet */
  cancelOrder: (id: string, reason?: string, refundTo?: 'ORIGINAL_PAYMENT' | 'WALLET') => http(`/customer/orders/${id}/cancel`, { method: 'POST', body: { reason, ...(refundTo ? { refundTo } : {}) } }),
  reorder: (id: string) => http(`/customer/orders/${id}/reorder`, { method: 'POST', body: {} }),
};
