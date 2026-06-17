export interface CreateTransferInputData {
  userId: string;
  sourceAccountId: string;
  destinationAccountId: string;
  amount: number;
  date: string;
  description?: string | null;
}
