import { apiConfig, getApiBaseUrlOrThrow } from './config';
import { ApiError, normalizeError } from './errors';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type RequestOptions = {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: unknown;
  token?: string;
  timeoutMs?: number;
};

async function parseJsonSafe(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function buildUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getApiBaseUrlOrThrow()}${normalizedPath}`;
}

async function request<TResponse>(
  path: string,
  options: RequestOptions = {}
): Promise<TResponse> {
  const method = options.method ?? 'GET';
  const timeoutMs = options.timeoutMs ?? apiConfig.timeoutMs;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const url = buildUrl(path);

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options.headers,
  };

  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  if (options.token) {
    headers.Authorization = `Bearer ${options.token}`;
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const data = await parseJsonSafe(response);

    if (!response.ok) {
      const errorCode =
        response.status === 401
          ? 'UNAUTHORIZED'
          : response.status >= 500
            ? 'SERVER_ERROR'
            : 'HTTP_ERROR';

      const errorMessage =
        errorCode === 'UNAUTHORIZED'
          ? 'Unauthorized request (401).'
          : errorCode === 'SERVER_ERROR'
            ? 'Server error (5xx).'
            : `Request failed with status ${response.status}.`;

      throw new ApiError(
        errorMessage,
        response.status,
        data,
        url,
        errorCode
      );
    }

    return data as TResponse;
  } catch (error) {
    throw normalizeError(error);
  } finally {
    clearTimeout(timeoutId);
  }
}

export const apiClient = {
  get<TResponse>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return request<TResponse>(path, { ...options, method: 'GET' });
  },
  post<TResponse, TBody = unknown>(
    path: string,
    body: TBody,
    options?: Omit<RequestOptions, 'method' | 'body'>
  ) {
    return request<TResponse>(path, { ...options, method: 'POST', body });
  },
};
