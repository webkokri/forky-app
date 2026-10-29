// Mapbox Geocoding API v6. Needs a *public* token (pk.…) in EXPO_PUBLIC_MAPBOX_TOKEN.
const TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? '';
const BASE = 'https://api.mapbox.com/search/geocode/v6';

export const mapboxEnabled = TOKEN.length > 0;

export type Place = {
  label: string; // short display text, e.g. "24 Queen St W, Mississauga"
  line1: string;
  city: string;
  province: string;
  postalCode: string;
  lat: number;
  lng: number;
  /** Set when the user picked it themselves (e.g. ordering for someone else). */
  custom?: boolean;
  /** Unit / buzzer / recipient notes for the driver. */
  notes?: string;
};

const toPlace = (f: any): Place | null => {
  const p = f?.properties;
  const c = p?.coordinates ?? { latitude: f?.geometry?.coordinates?.[1], longitude: f?.geometry?.coordinates?.[0] };
  if (!p || c.latitude == null || c.longitude == null) return null;
  const ctx = p.context ?? {};
  const line1 = ctx.address?.name ?? p.name;
  const city = ctx.place?.name ?? ctx.locality?.name ?? ctx.district?.name ?? '';
  return {
    label: [line1, city].filter(Boolean).join(', '),
    line1,
    city,
    province: ctx.region?.region_code ?? 'ON',
    postalCode: ctx.postcode?.name ?? '',
    lat: c.latitude,
    lng: c.longitude,
  };
};

async function get(path: string, params: Record<string, string | number | undefined>): Promise<Place[]> {
  if (!mapboxEnabled) return [];
  const q = new URLSearchParams({ access_token: TOKEN, language: 'en', ...Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${BASE}${path}?${q}`);
  if (!res.ok) throw new Error('Address search failed');
  const json = await res.json();
  return (json.features as any[]).map(toPlace).filter((x): x is Place => !!x);
}

/** Address autocomplete, biased towards the user's position. */
export const searchAddress = (q: string, near?: { lat?: number; lng?: number }) =>
  get('/forward', {
    q,
    autocomplete: 'true',
    country: 'ca',
    limit: 6,
    types: 'address,street,place,neighborhood',
    proximity: near?.lat != null && near?.lng != null ? `${near.lng},${near.lat}` : 'ip',
  });

/** Street address for a GPS fix. */
export const reverseGeocode = async (lat: number, lng: number) =>
  (await get('/reverse', { longitude: lng, latitude: lat, types: 'address', limit: 1 }))[0] ?? null;

type LL = { lat: number; lng: number };
/** Mapbox Static Images URL showing the store, the delivery address and (live) the driver, framed automatically. */
export function staticMapUrl(o: { store?: LL | null; home?: LL | null; driver?: LL | null; width: number; height: number }): string | null {
  if (!mapboxEnabled) return null;
  const pins: string[] = [];
  if (o.store) pins.push(`pin-s-restaurant+FF6819(${o.store.lng},${o.store.lat})`);
  if (o.home) pins.push(`pin-s-building+1C1A17(${o.home.lng},${o.home.lat})`);
  if (o.driver) pins.push(`pin-l-bicycle+2F7A52(${o.driver.lng},${o.driver.lat})`);
  if (!pins.length) return null;
  const w = Math.min(1280, Math.round(o.width)); const h = Math.min(1280, Math.round(o.height));
  return `https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/${pins.join(',')}/auto/${w}x${h}@2x?padding=60&logo=false&attribution=false&access_token=${TOKEN}`;
}
