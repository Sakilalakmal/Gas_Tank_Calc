export type AppErrorKind = 'NetworkError' | 'ApiError' | 'UnknownError';
export type ApiErrorCode = 'UNAUTHORIZED' | 'SERVER_ERROR' | 'HTTP_ERROR';

export class NetworkError extends Error {
  readonly kind = 'NetworkError';

  constructor(
    message: string,
    public readonly isTimeout: boolean = false
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class ApiError extends Error {
  readonly kind = 'ApiError';

  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
    public readonly url: string,
    public readonly code: ApiErrorCode
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class UnknownError extends Error {
  readonly kind = 'UnknownError';

  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'UnknownError';
  }
}

export type NormalizedError = NetworkError | ApiError | UnknownError;

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    (error as { name?: string }).name === 'AbortError'
  );
}

export function normalizeError(error: unknown): NormalizedError {
  if (
    error instanceof NetworkError ||
    error instanceof ApiError ||
    error instanceof UnknownError
  ) {
    return error;
  }

  if (isAbortError(error)) {
    return new NetworkError('Request timed out. Please try again.', true);
  }

  if (error instanceof TypeError) {
    return new NetworkError(
      'Unable to reach server. Check network and API URL.',
      false
    );
  }

  if (error instanceof Error) {
    return new UnknownError(error.message, error);
  }

  return new UnknownError('Unexpected error occurred.', error);
}

export function formatErrorForDebug(error: NormalizedError) {
  if (error.kind === 'ApiError') {
    return {
      kind: error.kind,
      message: error.message,
      status: error.status,
      url: error.url,
      data: error.data,
      code: error.code,
    };
  }

  if (error.kind === 'NetworkError') {
    return {
      kind: error.kind,
      message: error.message,
      isTimeout: error.isTimeout,
    };
  }

  return {
    kind: error.kind,
    message: error.message,
    cause: error.cause,
  };
}
