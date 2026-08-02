import { createTransferInputSchema } from './create-transfer-input.dto';

export const updateTransferInputSchema = createTransferInputSchema;

export type UpdateTransferInput = import('./create-transfer-input.dto').CreateTransferInput;
