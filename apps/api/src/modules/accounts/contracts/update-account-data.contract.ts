export interface UpdateAccountData {
  name?: string;
  balance?: number;
  overriddenFields?: string[];
  hiddenAt?: Date | null;
}
