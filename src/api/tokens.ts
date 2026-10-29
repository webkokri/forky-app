import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Access/refresh JWTs are issued by POST /auth/login. SecureStore on native, localStorage on web.
const ACCESS = 'forky_token';
const REFRESH = 'forky_refresh';

let access: string | null = null;
let refresh: string | null = null;

const read = async (k: string) => {
  try {
    return Platform.OS === 'web' ? globalThis.localStorage?.getItem(k) ?? null : await SecureStore.getItemAsync(k);
  } catch {
    return null;
  }
};
const write = async (k: string, v: string | null) => {
  try {
    if (Platform.OS === 'web') {
      if (v === null) globalThis.localStorage?.removeItem(k);
      else globalThis.localStorage?.setItem(k, v);
    } else if (v === null) await SecureStore.deleteItemAsync(k);
    else await SecureStore.setItemAsync(k, v);
  } catch {}
};

export const tokens = {
  get access() { return access; },
  get refresh() { return refresh; },
  async load() {
    [access, refresh] = await Promise.all([read(ACCESS), read(REFRESH)]);
  },
  async set(p: { accessToken: string; refreshToken?: string }) {
    access = p.accessToken;
    if (p.refreshToken) refresh = p.refreshToken;
    await Promise.all([write(ACCESS, access), p.refreshToken ? write(REFRESH, refresh) : null]);
  },
  async clear() {
    access = refresh = null;
    await Promise.all([write(ACCESS, null), write(REFRESH, null)]);
  },
};
