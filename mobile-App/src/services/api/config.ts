import { Platform } from 'react-native';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim() ?? '';
const isBaseUrlConfigured = rawBaseUrl.length > 0;

const missingBaseUrlErrorMessage =
  'API Base URL not configured. Set EXPO_PUBLIC_API_BASE_URL in .env';

export const apiConfig = {
  baseUrl: rawBaseUrl,
  isBaseUrlConfigured,
  missingBaseUrlErrorMessage,
  timeoutMs: 8000,
  platform: Platform.OS,
} as const;

export function getApiBaseUrlOrThrow(): string {
  if (!apiConfig.isBaseUrlConfigured) {
    throw new Error(apiConfig.missingBaseUrlErrorMessage);
  }

  return apiConfig.baseUrl;
}
