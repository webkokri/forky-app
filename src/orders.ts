import type Ionicons from '@expo/vector-icons/Ionicons';

// Orders come from the API; fields vary a little between endpoints so everything is optional.
export type Order = {
  id: string;
  orderNumber?: string | number;
  status?: string;
  type?: string;
  total?: number | string;
  grandTotal?: number | string;
  subtotal?: number | string;
  deliveryFee?: number | string;
  tip?: number | string;
  serviceFee?: number | string;
  taxAmount?: number | string;
  discountTotal?: number | string;
  walletUsed?: number | string;
  paymentMethod?: string;
  paymentStatus?: string;
  code?: string;
  createdAt?: string;
  restaurant?: { name?: string } | null;
  store?: { name?: string } | null;
  items?: { id?: string; name?: string; quantity?: number; qty?: number; price?: number | string; totalPrice?: number | string }[];
};

type Info = { label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; step: number };
const PENDING: Info = { label: 'Placed', icon: 'time-outline', bg: '#FDF1D8', fg: '#7A4F00', step: 0 };

const MAP: Record<string, Info> = {
  PENDING: PENDING,
  PLACED: PENDING,
  CONFIRMED: { label: 'Confirmed', icon: 'checkmark-circle-outline', bg: '#E2ECF7', fg: '#1E4E8C', step: 1 },
  ACCEPTED: { label: 'Confirmed', icon: 'checkmark-circle-outline', bg: '#E2ECF7', fg: '#1E4E8C', step: 1 },
  PREPARING: { label: 'Preparing', icon: 'flame-outline', bg: '#FFE8DC', fg: '#8A3208', step: 2 },
  READY: { label: 'Ready', icon: 'bag-check-outline', bg: '#FFE8DC', fg: '#8A3208', step: 3 },
  READY_FOR_PICKUP: { label: 'Ready for pickup', icon: 'bag-check-outline', bg: '#FFE8DC', fg: '#8A3208', step: 3 },
  DRIVER_ASSIGNED: { label: 'Driver assigned', icon: 'person-circle-outline', bg: '#E2ECF7', fg: '#1E4E8C', step: 1 },
  PICKED_UP: { label: 'Out for delivery', icon: 'bicycle-outline', bg: '#E3F1EA', fg: '#1D5A3A', step: 4 },
  ON_THE_WAY: { label: 'Out for delivery', icon: 'bicycle-outline', bg: '#E3F1EA', fg: '#1D5A3A', step: 4 },
  OUT_FOR_DELIVERY: { label: 'Out for delivery', icon: 'bicycle-outline', bg: '#E3F1EA', fg: '#1D5A3A', step: 4 },
  COLLECTED: { label: 'Collected', icon: 'checkmark-done-outline', bg: '#E3F1EA', fg: '#1D5A3A', step: 5 },
  DELIVERED: { label: 'Delivered', icon: 'checkmark-done-outline', bg: '#E3F1EA', fg: '#1D5A3A', step: 5 },
  COMPLETED: { label: 'Completed', icon: 'checkmark-done-outline', bg: '#E3F1EA', fg: '#1D5A3A', step: 5 },
  CANCELLED: { label: 'Cancelled', icon: 'close-circle-outline', bg: '#FDE8E6', fg: '#8C1D18', step: -1 },
  REJECTED: { label: 'Declined', icon: 'close-circle-outline', bg: '#FDE8E6', fg: '#8C1D18', step: -1 },
  REFUNDED: { label: 'Refunded', icon: 'return-down-back-outline', bg: '#ECE6F5', fg: '#5B3E8A', step: -1 },
};

export const statusInfo = (status?: string): Info => MAP[String(status ?? '').toUpperCase()] ?? { ...PENDING, label: status ? status.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase()) : 'Placed' };
export const isActive = (status?: string) => { const s = statusInfo(status).step; return s >= 0 && s < 5; };
export const canCancel = (status?: string) => ['PENDING', 'PLACED', 'CONFIRMED', 'ACCEPTED'].includes(String(status ?? '').toUpperCase());
export const STEPS = ['Placed', 'Confirmed', 'Preparing', 'Ready', 'Out for delivery', 'Delivered'];
export const PICKUP_STEPS = ['Placed', 'Confirmed', 'Preparing', 'Ready for pickup', 'Collected'];
