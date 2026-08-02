export type DomainErrorTranslationArgs = Record<string, string | number | boolean>;

export interface DomainErrorParams {
  code?: string;
  message?: string;
  i18nKey?: string;
  i18nArgs?: DomainErrorTranslationArgs;
}

function parseDomainErrorParams(params?: DomainErrorParams | string): DomainErrorParams {
  if (!params) {
    return {};
  }

  if (typeof params === 'string') {
    if (params.startsWith('errors.')) {
      return { i18nKey: params };
    }

    return { message: params };
  }

  return params;
}

export abstract class DomainError extends Error {
  readonly code: string;
  readonly i18nKey?: string;
  readonly i18nArgs?: DomainErrorTranslationArgs;

  protected constructor(name: string, params?: DomainErrorParams | string) {
    const parsedParams = parseDomainErrorParams(params);

    super(parsedParams.message ?? parsedParams.i18nKey ?? name);

    this.name = name;
    this.code = parsedParams.code ?? name;
    this.i18nKey = parsedParams.i18nKey;
    this.i18nArgs = parsedParams.i18nArgs;
  }
}
