import { refreshTokenOutputSchema } from '@mybills/dtos/auth';

export class ApiClientError extends Error {
  readonly statusCode: number;
  readonly code?: string;
  readonly errorKind?: string;

  constructor(params: {
    statusCode: number;
    message: string;
    code?: string;
    errorKind?: string;
  }) {
    super(params.message);
    this.name = 'ApiClientError';
    this.statusCode = params.statusCode;
    this.code = params.code;
    this.errorKind = params.errorKind;
  }
}

export type HttpClientAuth = {
  getAccessToken: () => Promise<string | null>;
  getRefreshToken: () => Promise<string | null>;
  persistTokens: (tokens: { accessToken: string; refreshToken: string }) => Promise<void>;
  onSessionInvalid: () => Promise<void>;
};

export type CreateHttpClientOptions = {
  baseUrl: string;
  auth?: HttpClientAuth;
};

export type HttpClient = {
  readonly baseUrl: string;
  postJson: <TResponse>(path: string, body: unknown) => Promise<TResponse>;
  getJson: <TResponse>(path: string) => Promise<TResponse>;
  patchJson: <TResponse>(path: string, body: unknown) => Promise<TResponse>;
  deleteJson: (path: string) => Promise<void>;
};

function normalizeErrorMessage(body: Record<string, unknown>): string {
  const msg = body.message;
  if (typeof msg === 'string') {
    return msg;
  }
  if (Array.isArray(msg) && msg.length > 0 && typeof msg[0] === 'string') {
    return msg[0];
  }
  const err = body.error;
  if (typeof err === 'string') {
    return err;
  }
  return 'Request failed';
}

function parseErrorJson(statusCode: number, json: unknown): ApiClientError {
  if (json && typeof json === 'object') {
    const o = json as Record<string, unknown>;
    return new ApiClientError({
      statusCode,
      message: normalizeErrorMessage(o),
      code: typeof o.code === 'string' ? o.code : undefined,
      errorKind: typeof o.error === 'string' ? o.error : undefined
    });
  }
  return new ApiClientError({
    statusCode,
    message: 'Request failed',
    code: 'unknown_error'
  });
}

const PUBLIC_AUTH_PATHS = new Set(['/auth/register', '/auth/login', '/auth/refresh']);

function normalizePath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

function isPublicAuthPath(normalizedPath: string): boolean {
  return PUBLIC_AUTH_PATHS.has(normalizedPath);
}

type FetchJsonResult = {
  status: number;
  ok: boolean;
  json: unknown;
  rawText: string;
};

async function fetchPostJson(
  baseUrl: string,
  normalizedPath: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<FetchJsonResult> {
  const url = `${baseUrl}${normalizedPath}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Network request failed';
    throw new ApiClientError({
      statusCode: 0,
      message,
      code: 'client.network_error'
    });
  }

  const rawText = await response.text();
  let json: unknown;
  try {
    json = rawText ? JSON.parse(rawText) : undefined;
  } catch {
    json = undefined;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    rawText
  };
}

async function fetchGetJson(
  baseUrl: string,
  normalizedPath: string,
  extraHeaders?: Record<string, string>
): Promise<FetchJsonResult> {
  const url = `${baseUrl}${normalizedPath}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...extraHeaders
      }
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Network request failed';
    throw new ApiClientError({
      statusCode: 0,
      message,
      code: 'client.network_error'
    });
  }

  const rawText = await response.text();
  let json: unknown;
  try {
    json = rawText ? JSON.parse(rawText) : undefined;
  } catch {
    json = undefined;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    rawText
  };
}

async function fetchPatchJson(
  baseUrl: string,
  normalizedPath: string,
  body: unknown,
  extraHeaders?: Record<string, string>
): Promise<FetchJsonResult> {
  const url = `${baseUrl}${normalizedPath}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Network request failed';
    throw new ApiClientError({
      statusCode: 0,
      message,
      code: 'client.network_error'
    });
  }

  const rawText = await response.text();
  let json: unknown;
  try {
    json = rawText ? JSON.parse(rawText) : undefined;
  } catch {
    json = undefined;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    rawText
  };
}

async function fetchDeleteJson(
  baseUrl: string,
  normalizedPath: string,
  extraHeaders?: Record<string, string>
): Promise<FetchJsonResult> {
  const url = `${baseUrl}${normalizedPath}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Accept: 'application/json',
        ...extraHeaders
      }
    });
  } catch (cause) {
    const message =
      cause instanceof Error ? cause.message : 'Network request failed';
    throw new ApiClientError({
      statusCode: 0,
      message,
      code: 'client.network_error'
    });
  }

  const rawText = await response.text();
  let json: unknown;
  try {
    json = rawText ? JSON.parse(rawText) : undefined;
  } catch {
    json = undefined;
  }

  return {
    status: response.status,
    ok: response.ok,
    json,
    rawText
  };
}

function assertOk(result: FetchJsonResult): unknown {
  if (!result.ok) {
    throw parseErrorJson(result.status, result.json ?? { message: result.rawText });
  }
  return result.json;
}

export function createHttpClient(options: CreateHttpClientOptions): HttpClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');
  const auth = options.auth;

  let refreshInFlight: Promise<void> | null = null;

  async function postBare(normalizedPath: string, body: unknown): Promise<unknown> {
    const result = await fetchPostJson(baseUrl, normalizedPath, body);
    return assertOk(result);
  }

  async function performRefresh(): Promise<void> {
    if (!auth) {
      return;
    }

    const rt = await auth.getRefreshToken();
    if (!rt) {
      await auth.onSessionInvalid();
      throw new ApiClientError({
        statusCode: 401,
        message: 'Session expired',
        code: 'auth.session_invalid'
      });
    }

    try {
      const raw = await postBare('/auth/refresh', { refreshToken: rt });
      const parsed = refreshTokenOutputSchema.parse(raw);
      await auth.persistTokens(parsed);
    } catch (e) {
      await auth.onSessionInvalid();
      throw e;
    }
  }

  async function refreshWithMutex(): Promise<void> {
    if (!auth) {
      return;
    }
    if (!refreshInFlight) {
      refreshInFlight = performRefresh().finally(() => {
        refreshInFlight = null;
      });
    }
    await refreshInFlight;
  }

  return {
    baseUrl,
    async postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
      const normalizedPath = normalizePath(path);

      if (!auth || isPublicAuthPath(normalizedPath)) {
        const result = await fetchPostJson(baseUrl, normalizedPath, body);
        return assertOk(result) as TResponse;
      }

      const token = await auth.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let result = await fetchPostJson(baseUrl, normalizedPath, body, headers);

      if (result.status === 401) {
        await refreshWithMutex();
        const newToken = await auth.getAccessToken();
        const retryHeaders: Record<string, string> = {};
        if (newToken) {
          retryHeaders.Authorization = `Bearer ${newToken}`;
        }
        result = await fetchPostJson(baseUrl, normalizedPath, body, retryHeaders);
      }

      return assertOk(result) as TResponse;
    },

    async getJson<TResponse>(path: string): Promise<TResponse> {
      const normalizedPath = normalizePath(path);

      if (!auth) {
        const result = await fetchGetJson(baseUrl, normalizedPath);
        return assertOk(result) as TResponse;
      }

      const token = await auth.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let result = await fetchGetJson(baseUrl, normalizedPath, headers);

      if (result.status === 401) {
        await refreshWithMutex();
        const newToken = await auth.getAccessToken();
        const retryHeaders: Record<string, string> = {};
        if (newToken) {
          retryHeaders.Authorization = `Bearer ${newToken}`;
        }
        result = await fetchGetJson(baseUrl, normalizedPath, retryHeaders);
      }

      return assertOk(result) as TResponse;
    },

    async patchJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
      const normalizedPath = normalizePath(path);

      if (!auth || isPublicAuthPath(normalizedPath)) {
        const result = await fetchPatchJson(baseUrl, normalizedPath, body);
        return assertOk(result) as TResponse;
      }

      const token = await auth.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let result = await fetchPatchJson(baseUrl, normalizedPath, body, headers);

      if (result.status === 401) {
        await refreshWithMutex();
        const newToken = await auth.getAccessToken();
        const retryHeaders: Record<string, string> = {};
        if (newToken) {
          retryHeaders.Authorization = `Bearer ${newToken}`;
        }
        result = await fetchPatchJson(baseUrl, normalizedPath, body, retryHeaders);
      }

      return assertOk(result) as TResponse;
    },

    async deleteJson(path: string): Promise<void> {
      const normalizedPath = normalizePath(path);

      if (!auth) {
        const result = await fetchDeleteJson(baseUrl, normalizedPath);
        assertOk(result);
        return;
      }

      const token = await auth.getAccessToken();
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      let result = await fetchDeleteJson(baseUrl, normalizedPath, headers);

      if (result.status === 401) {
        await refreshWithMutex();
        const newToken = await auth.getAccessToken();
        const retryHeaders: Record<string, string> = {};
        if (newToken) {
          retryHeaders.Authorization = `Bearer ${newToken}`;
        }
        result = await fetchDeleteJson(baseUrl, normalizedPath, retryHeaders);
      }

      assertOk(result);
    }
  };
}
