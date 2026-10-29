// Forky API (same backend as forksy-frontend). Override per build with EXPO_PUBLIC_API_BASE_URL.
export const API_ORIGIN = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.forky.ca').replace(/\/+$/, '');
export const API_URL = `${API_ORIGIN}/api/v1`;
