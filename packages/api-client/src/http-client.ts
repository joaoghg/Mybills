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

export type HttpClient = {
  readonly baseUrl: string;
  postJson: <TResponse>(path: string, body: unknown) => Promise<TResponse>;
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

export function createHttpClient(options: { baseUrl: string }): HttpClient {
  const baseUrl = options.baseUrl.replace(/\/$/, '');

  return {
    baseUrl,
    async postJson<TResponse>(path: string, body: unknown): Promise<TResponse> {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const url = `${baseUrl}${normalizedPath}`;

      let response: Response;
      try {
        response = await fetch(url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json'
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

      const text = await response.text();
      let json: unknown;
      try {
        json = text ? JSON.parse(text) : undefined;
      } catch {
        json = undefined;
      }

      if (!response.ok) {
        throw parseErrorJson(response.status, json ?? { message: text });
      }

      return json as TResponse;
    }
  };
}
