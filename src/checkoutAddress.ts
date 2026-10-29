import { api } from '@/api';
import type { Place } from '@/mapbox';

const cache = new Map<string, string>();
const norm = (s?: string) => (s ?? '').replace(/\s/g, '').toLowerCase();

/** Server address id for the delivery address chosen in the app: reuses a saved match, otherwise saves it (with coordinates). */
export async function ensureAddressId(d: Place): Promise<string | null> {
  const key = `${d.lat.toFixed(5)},${d.lng.toFixed(5)},${norm(d.line1)}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const list = (await api.listAddresses()) as { id: string; line1?: string; postalCode?: string }[];
  const same = list.find((x) => norm(x.line1) === norm(d.line1) && norm(x.postalCode) === norm(d.postalCode));
  let id = same?.id ?? null;
  if (!id && d.line1 && d.postalCode) {
    const a = (await api.addAddress({ label: d.custom ? 'Delivery' : 'Current location', line1: d.line1, city: d.city, province: d.province, postalCode: d.postalCode, lat: d.lat, lng: d.lng, dropoffNotes: d.notes })) as { id: string };
    id = a.id;
  }
  if (!id) {
    const def = list.find((x: any) => x.isDefault) ?? list[0];
    id = def?.id ?? null;
  }
  if (id) cache.set(key, id);
  return id;
}
