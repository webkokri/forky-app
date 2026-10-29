import * as Location from 'expo-location';
import { createContext, useCallback, useRef, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '@/api';
import { mapboxEnabled, reverseGeocode, type Place } from '@/mapbox';
import type { MenuItem, Store } from '@/data';
import type { StoreTypeInfo } from '@/storeTypes';

type CatalogState = {
  stores: Store[];
  /** Categories from the API (/public/store-types), with live counts for the current location. */
  storeTypes: StoreTypeInfo[];
  /** What Forky knows about the selected location: do we deliver here, which city/zone. */
  area: { serviceable: boolean; city?: string; zone?: string } | null;
  /** Label of the delivery address, e.g. "24 Queen St W, Mississauga". */
  place: string | null;
  /** Where orders are delivered: the device's GPS address, or one the user picked. */
  deliverTo: Place | null;
  /** Pick a different delivery address (null = go back to the device location). */
  selectLocation: (p: Place | null) => void;
  /** Device coordinates, used to bias address search. */
  geo: { lat?: number; lng?: number } | null;
  loading: boolean;
  /** True when the last attempt to reach the API failed (slow or no connection). */
  offline: boolean;
  getStore: (id: string) => Store | undefined;
  getItems: (storeId: string) => MenuItem[];
  allItems: MenuItem[];
  /** Fetches a store's menu (idempotent). */
  loadStore: (id: string, force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CatalogState | null>(null);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [stores, setStores] = useState<Store[]>([]);
  const [menus, setMenus] = useState<Record<string, MenuItem[]>>({});
  const menusRef = useRef(menus);
  useEffect(() => { menusRef.current = menus; });
  const [area, setArea] = useState<CatalogState['area']>(null);
  const [storeTypes, setStoreTypes] = useState<StoreTypeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);

  const [deliverTo, setDeliverTo] = useState<Place | null>(null);
  const [geo, setGeo] = useState<{ lat?: number; lng?: number } | null>(null);

  // Device location: GPS fix, then a street address from Mapbox (falls back to the OS geocoder).
  const detect = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return setGeo({});
      const timeout = new Promise<null>((r) => setTimeout(() => r(null), 10000));
      const pos = (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }), timeout]).catch(() => null)) ?? (await Location.getLastKnownPositionAsync().catch(() => null));
      if (!pos) return setGeo({});
      const { latitude: lat, longitude: lng } = pos.coords;
      setGeo({ lat, lng });
      let found: Place | null = null;
      if (mapboxEnabled) found = await reverseGeocode(lat, lng).catch(() => null);
      if (!found) {
        const [a] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
        if (a) {
          const line1 = [a.streetNumber, a.street].filter(Boolean).join(' ') || a.name || '';
          const city = a.city ?? a.subregion ?? '';
          found = { label: [line1, city].filter(Boolean).join(', '), line1, city, province: a.region ?? 'ON', postalCode: a.postalCode ?? '', lat, lng };
        }
      }
      setDeliverTo(found ? { ...found, lat, lng } : null);
    } catch {
      setGeo({});
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- runs once; state is only set after awaited calls
    void detect();
  }, [detect]);

  const selectLocation = useCallback((p: Place | null) => {
    if (!p) return void detect();
    setDeliverTo({ ...p, custom: true });
    setLoading(true); // stores/restaurants reload for the new address
    setGeo({ lat: p.lat, lng: p.lng });
  }, [detect]);

  const load = useCallback(async () => {
    if (!geo) return;
    try {
      const [food, retail] = await Promise.all([api.listStores({ vertical: 'FOOD', ...geo }), api.listStores({ vertical: 'RETAIL', ...geo })]);
      const fresh = [...food, ...retail].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      setStores((prev) => [...fresh, ...prev.filter((p) => menusRef.current[p.id]?.length && !fresh.some((f) => f.id === p.id))]);
      setOffline(false);
      api.storeTypes(geo).then(setStoreTypes).catch(() => {});
      if (geo.lat != null && geo.lng != null) api.resolveZone(geo.lat, geo.lng).then((z) => setArea({ serviceable: !!z.serviceable, city: z.city?.name, zone: z.zone?.name })).catch(() => {});
      else setArea(null);
    } catch {
      // keep whatever was already loaded; the UI shows a retry banner instead of fake stores
      setOffline(true);
    } finally {
      setLoading(false);
    }
  }, [geo]);

  useEffect(() => {
    void load();
  }, [load]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await load();
  }, [load]);

  const loadStore = useCallback(async (id: string, force = false) => {
    if (!force && menus[id]?.length) return;
    try {
      const { store, items } = await api.getStore(id, geo ?? {});
      setMenus((m) => ({ ...m, [id]: items }));
      setStores((list) => (list.some((s) => s.id === id) ? list.map((s) => (s.id === id ? { ...s, ...store } : s)) : [...list, store]));
    } catch {}
  }, [menus, geo]);

  const value = useMemo<CatalogState>(() => ({
    stores,
    storeTypes,
    area,
    place: deliverTo?.label ?? null,
    deliverTo,
    selectLocation,
    geo,
    loading,
    offline,
    getStore: (id) => stores.find((s) => s.id === id),
    getItems: (storeId) => menus[storeId] ?? [],
    allItems: Object.values(menus).flat(),
    loadStore,
    refresh,
  }), [stores, storeTypes, area, deliverTo, selectLocation, geo, menus, loading, offline, loadStore, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCatalog must be used inside <CatalogProvider>');
  return ctx;
}
