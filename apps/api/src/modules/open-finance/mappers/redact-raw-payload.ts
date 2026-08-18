const SENSITIVE_KEY_PATTERN =
  /(tax|document|cpf|cnpj|identity|owner|accountnumber|transfernumber|cardnumber|routing)/i;

export function redactRawPayload(payload: unknown): Record<string, unknown> {
  return redactValue(payload) as Record<string, unknown>;
}

function redactValue(value: unknown): unknown {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, entry] of Object.entries(record)) {
      if (SENSITIVE_KEY_PATTERN.test(key)) {
        result[key] = typeof entry === 'string' ? '[redacted]' : redactValue(entry);
        continue;
      }

      result[key] = redactValue(entry);
    }

    return result;
  }

  return value;
}
