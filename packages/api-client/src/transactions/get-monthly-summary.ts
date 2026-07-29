import {
  monthlySummaryOutputSchema,
  type MonthlySummaryOutput,
  type MonthlySummaryQueryInput
} from '@mybills/dtos';

import type { HttpClient } from '../http-client.js';

export async function getMonthlySummary(
  client: HttpClient,
  query: MonthlySummaryQueryInput
): Promise<MonthlySummaryOutput> {
  const params = new URLSearchParams({
    month: String(query.month),
    year: String(query.year)
  });

  const raw = await client.getJson<unknown>(`/transactions/summary?${params.toString()}`);
  return monthlySummaryOutputSchema.parse(raw);
}
