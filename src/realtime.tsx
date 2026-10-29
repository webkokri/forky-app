import { router } from 'expo-router';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import { api, API_ORIGIN, tokens } from '@/api';
import { useAuth } from '@/auth';
import { askNotificationPermission, onNotificationTap, registerForPush, showLocalNotification } from '@/notify';
import { InAppBanner, type BannerData } from '@/components/InAppBanner';

type Handler = (payload: any) => void;

type RealtimeState = {
  connected: boolean;
  /** Unread in-app notifications (kept in sync by the server). */
  unread: number;
  /** Listen to a socket event (order.status, driver.location, order.driver_arrived, order.eta, …). Returns an unsubscribe function. */
  on: (event: string, fn: Handler) => () => void;
  /** Join an order's live room; leave it when the returned function is called. */
  watchOrder: (orderId: string) => () => void;
};

const Ctx = createContext<RealtimeState | null>(null);

export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const uid = user?.id;
  const socketRef = useRef<Socket | null>(null);
  const handlers = useRef(new Map<string, Set<Handler>>());
  const watching = useRef(new Map<string, number>());
  const [connected, setConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [banner, setBanner] = useState<BannerData | null>(null);

  const dispatch = useCallback((event: string, payload: any) => {
    handlers.current.get(event)?.forEach((fn) => fn(payload));
  }, []);

  // one socket per signed-in user; a fresh token is read on every (re)connect
  useEffect(() => {
    if (!uid) return;
    const socket = io(API_ORIGIN, {
      transports: ['websocket'],
      auth: (cb) => cb({ token: tokens.access }),
      reconnection: true,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 15000,
    });
    socketRef.current = socket;
    const rejoin = () => watching.current.forEach((_n, id) => socket.emit('order.subscribe', { orderId: id }));

    socket.on('connect', () => { setConnected(true); rejoin(); });
    socket.on('disconnect', () => setConnected(false));
    // an expired access token is renewed through the normal API refresh, then the socket reconnects
    const renew = async () => { await api.me().catch(() => null); if (socket.disconnected) socket.connect(); };
    socket.on('connect_error', () => { void renew(); });
    socket.on('error', () => { void renew(); });

    // server notifications → show them as phone notifications too (order accepted, preparing, out for delivery, driver arrived, delivered …)
    socket.on('notification', (n: { id?: string; title?: string; body?: string; data?: Record<string, unknown> }) => {
      setUnread((c) => c + 1);
      // a phone notification when the platform allows it, otherwise an in-app banner
      if (n?.title) void showLocalNotification({ key: n.id, title: n.title, body: n.body, data: n.data }).then((ok) => { if (!ok) setBanner({ id: n.id ?? String(Date.now()), title: n.title!, body: n.body, orderId: (n.data as { orderId?: string } | undefined)?.orderId }); });
      dispatch('notification', n);
    });
    socket.on('notification.read', (n: { unread?: number }) => { if (typeof n?.unread === 'number') setUnread(n.unread); });

    for (const ev of ['order.status', 'order.updated', 'order.eta', 'order.driver_assigned', 'order.driver_unassigned', 'order.driver_arrived', 'order.item_removed', 'order.released', 'driver.location']) {
      socket.on(ev, (p) => dispatch(ev, p));
    }

    api.unreadNotifications().then((r: any) => setUnread(Number(r?.count ?? 0))).catch(() => {});
    void askNotificationPermission().then((ok) => ok && registerForPush());
    return () => { socket.removeAllListeners(); socket.disconnect(); socketRef.current = null; setConnected(false); };
  }, [uid, dispatch]);

  // tapping a notification opens its order
  useEffect(() => {
    return onNotificationTap((data) => { if (data?.orderId) router.push({ pathname: '/order/[id]', params: { id: data.orderId } }); });
  }, []);

  const on = useCallback((event: string, fn: Handler) => {
    const set = handlers.current.get(event) ?? new Set<Handler>();
    set.add(fn);
    handlers.current.set(event, set);
    return () => { set.delete(fn); };
  }, []);

  const watchOrder = useCallback((orderId: string) => {
    watching.current.set(orderId, (watching.current.get(orderId) ?? 0) + 1);
    socketRef.current?.connected && socketRef.current.emit('order.subscribe', { orderId });
    return () => {
      const n = (watching.current.get(orderId) ?? 1) - 1;
      if (n <= 0) { watching.current.delete(orderId); socketRef.current?.emit('order.unsubscribe', { orderId }); } else watching.current.set(orderId, n);
    };
  }, []);

  const value = useMemo<RealtimeState>(() => ({ connected, unread, on, watchOrder }), [connected, unread, on, watchOrder]);
  return (
    <Ctx.Provider value={value}>
      {children}
      <InAppBanner banner={banner} onDone={() => setBanner(null)} />
    </Ctx.Provider>
  );
}

export function useRealtime() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useRealtime must be used inside <RealtimeProvider>');
  return ctx;
}
