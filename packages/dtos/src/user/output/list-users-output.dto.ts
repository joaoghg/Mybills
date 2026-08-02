import z from 'zod';
import { userOutputSchema } from './user-output.dto';

export const listUsersOutputSchema = z.array(userOutputSchema);

export type ListUsersOutput = z.infer<typeof listUsersOutputSchema>;