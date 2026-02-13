import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

import { apiConfig, getApiBaseUrlOrThrow } from './config';

type UnauthorizedHandler = () => void | Promise<void>;

type RequestConfigWithGuard = InternalAxiosRequestConfig & {
  _unauthorizedHandled?: boolean;
};

let authToken: string | null = null;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export const http = axios.create({
  baseURL: getApiBaseUrlOrThrow(),
  timeout: apiConfig.timeoutMs,
});

export function setAuthToken(token: string | null): void {
  authToken = token;

  if (token) {
    http.defaults.headers.common.Authorization = `Bearer ${token}`;
    return;
  }

  delete http.defaults.headers.common.Authorization;
}

export function registerUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

http.interceptors.request.use(
  (config) => {
    if (authToken) {
      config.headers =
        config.headers ?? ({} as InternalAxiosRequestConfig['headers']);

      if (!config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${authToken}`;
      }
    }

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

http.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const requestConfig = error.config as RequestConfigWithGuard | undefined;
    const requestUrl = requestConfig?.url ?? '';
    const isLogoutRequest = requestUrl.includes('/api/logout');

    if (
      status === 401 &&
      !isLogoutRequest &&
      !requestConfig?._unauthorizedHandled &&
      unauthorizedHandler
    ) {
      if (requestConfig) {
        requestConfig._unauthorizedHandled = true;
      }

      await unauthorizedHandler();
    }

    return Promise.reject(error);
  }
);
