import {
  OpenFinanceConnectionOutput,
  OpenFinanceProductStateOutput,
  OpenFinanceSyncRunOutput
} from '@mybills/dtos';

export type CreateOpenFinanceConnectionRecord = {
  userId: string;
  itemId: string;
  connectorId: number;
  itemStatus: OpenFinanceConnectionOutput['itemStatus'];
  institutionName: string | null;
  institutionLogoUrl: string | null;
};

export interface OpenFinanceConnectionRepository {
  findByItemId(itemId: string): Promise<OpenFinanceConnectionOutput | null>;
  findByIdAndUserId(connectionId: string, userId: string): Promise<OpenFinanceConnectionOutput | null>;
  findAllByUserId(userId: string): Promise<OpenFinanceConnectionOutput[]>;
  create(data: CreateOpenFinanceConnectionRecord): Promise<OpenFinanceConnectionOutput>;
  disconnect(connectionId: string): Promise<OpenFinanceConnectionOutput>;
  findSyncRunByIdAndUserId(
    connectionId: string,
    syncRunId: string,
    userId: string
  ): Promise<OpenFinanceSyncRunOutput | null>;
}

export type { OpenFinanceProductStateOutput };
