export function yearMonthFromYmd(ymd: string): string {
  return ymd.slice(0, 7);
}

export function firstDayOfYearMonth(yearMonth: string): string {
  return `${yearMonth}-01`;
}

export function competenceDatePayload(
  dateYmd: string,
  competenceYearMonth: string
): string | null {
  if (yearMonthFromYmd(dateYmd) === competenceYearMonth) {
    return null;
  }

  return firstDayOfYearMonth(competenceYearMonth);
}

export function withIncomeCompetenceDate<T extends { competenceDate?: string | null }>(
  parsed: T,
  params: {
    dateYmd: string;
    competenceYearMonth: string;
    enabled: boolean;
  }
): T {
  if (!params.enabled || params.competenceYearMonth.length < 7) {
    return parsed;
  }

  return {
    ...parsed,
    competenceDate: competenceDatePayload(params.dateYmd, params.competenceYearMonth)
  };
}
