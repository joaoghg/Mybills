import z from 'zod';

/** ISO 4217 currency code retained alongside integer-cent amounts. */
export const currencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);

/**
 * Provider decimal retained as a string to avoid IEEE-754 rounding.
 * Used for investment quantities, quota values, rates, and expenses.
 */
export const decimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);

/** Calendar month used for bill forecast / cash-flow attribution. */
export const yearMonthSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const isoDateTimeSchema = z.string();
