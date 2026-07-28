import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  CreateTransactionInput,
  createTransactionInputSchema,
  CreateTransferInput,
  createTransferInputSchema,
  CreateTransferOutput,
  createTransferOutputSchema,
  DeleteTransactionQueryInput,
  deleteTransactionQueryInputSchema,
  ListTransactionsOutput,
  listTransactionsOutputSchema,
  ListTransactionsQueryInput,
  listTransactionsQueryInputSchema,
  TransactionOutput,
  transactionOutputSchema,
  TransferGroupIdParams,
  transferGroupIdParamsSchema,
  UpdateTransactionInput,
  updateTransactionInputSchema,
  UpdateTransactionIsPaidInput,
  updateTransactionIsPaidInputSchema,
  UpdateTransferInput,
  updateTransferInputSchema
} from '@mybills/dtos';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { toJSONSchema } from 'zod';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import {
  TransactionIdParams,
  transactionIdParamsSchema
} from './contracts/transaction-id-params.contract';
import { TransactionsService } from './transactions.service';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  @ApiOperation({
    summary: 'List transactions',
    description:
      'Lists transactions of the authenticated user with optional filters. Use month/year or from/to (YYYY-MM-DD, inclusive UTC), not both.'
  })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Calendar month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Calendar year' })
  @ApiQuery({
    name: 'from',
    required: false,
    type: String,
    description: 'Range start YYYY-MM-DD (requires to; XOR month/year)'
  })
  @ApiQuery({
    name: 'to',
    required: false,
    type: String,
    description: 'Range end YYYY-MM-DD inclusive (requires from; XOR month/year)'
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Description search' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Category id' })
  @ApiQuery({ name: 'accountId', required: false, type: String, description: 'Account id' })
  @ApiQuery({ name: 'cardId', required: false, type: String, description: 'Credit card id' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['INCOME', 'EXPENSE'],
    description: 'Transaction type filter'
  })
  @ApiQuery({
    name: 'isPaid',
    required: false,
    type: Boolean,
    description: 'Filter by paid status'
  })
  @ApiQuery({
    name: 'isProjected',
    required: false,
    type: Boolean,
    description: 'Filter by projected (future recurring) status'
  })
  @ApiQuery({
    name: 'includeTransfer',
    required: false,
    type: Boolean,
    description: 'Include transfer transactions (default excludes when false)'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Max results (1-100)'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transactions listed successfully.',
    schema: toJSONSchema(listTransactionsOutputSchema) as SchemaObject
  })
  @Serialize(listTransactionsOutputSchema)
  async findAll(
    @CurrentUser('sub') userId: string,
    @Query(new ZodValidationPipe(listTransactionsQueryInputSchema)) query: ListTransactionsQueryInput
  ): Promise<ListTransactionsOutput> {
    return await this.transactionsService.findAll(userId, query);
  }

  @Post('transfer')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create transfer',
    description:
      'Transfers balance between two accounts and creates linked expense and income transactions.'
  })
  @ApiBody({
    schema: toJSONSchema(createTransferInputSchema) as SchemaObject,
    description: 'Transfer creation payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transfer created successfully.',
    schema: toJSONSchema(createTransferOutputSchema) as SchemaObject
  })
  @Serialize(createTransferOutputSchema)
  async createTransfer(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createTransferInputSchema)) data: CreateTransferInput
  ): Promise<CreateTransferOutput> {
    return await this.transactionsService.createTransfer({
      userId,
      sourceAccountId: data.sourceAccountId,
      destinationAccountId: data.destinationAccountId,
      amount: data.amount,
      date: data.date,
      description: data.description
    });
  }

  @Get('transfer/:transferGroupId')
  @ApiOperation({
    summary: 'Get transfer',
    description: 'Returns a transfer pair by transfer group id.'
  })
  @ApiParam({ name: 'transferGroupId', description: 'Transfer group id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer retrieved successfully.',
    schema: toJSONSchema(createTransferOutputSchema) as SchemaObject
  })
  @Serialize(createTransferOutputSchema)
  async findTransfer(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transferGroupIdParamsSchema)) params: TransferGroupIdParams
  ): Promise<CreateTransferOutput> {
    return await this.transactionsService.findTransferByGroupId(params.transferGroupId, userId);
  }

  @Patch('transfer/:transferGroupId')
  @ApiOperation({
    summary: 'Update transfer',
    description: 'Updates a transfer pair and rebalances both accounts atomically.'
  })
  @ApiParam({ name: 'transferGroupId', description: 'Transfer group id' })
  @ApiBody({
    schema: toJSONSchema(updateTransferInputSchema) as SchemaObject,
    description: 'Transfer update payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transfer updated successfully.',
    schema: toJSONSchema(createTransferOutputSchema) as SchemaObject
  })
  @Serialize(createTransferOutputSchema)
  async updateTransfer(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transferGroupIdParamsSchema)) params: TransferGroupIdParams,
    @Body(new ZodValidationPipe(updateTransferInputSchema)) data: UpdateTransferInput
  ): Promise<CreateTransferOutput> {
    return await this.transactionsService.updateTransfer(params.transferGroupId, userId, {
      sourceAccountId: data.sourceAccountId,
      destinationAccountId: data.destinationAccountId,
      amount: data.amount,
      date: data.date,
      description: data.description
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get transaction',
    description: 'Returns one transaction from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Transaction id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction retrieved successfully.',
    schema: toJSONSchema(transactionOutputSchema) as SchemaObject
  })
  @Serialize(transactionOutputSchema)
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transactionIdParamsSchema)) params: TransactionIdParams
  ): Promise<TransactionOutput> {
    return await this.transactionsService.findById(params.id, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create transaction',
    description: 'Creates a transaction for the authenticated user.'
  })
  @ApiBody({
    schema: toJSONSchema(createTransactionInputSchema) as SchemaObject,
    description: 'Transaction creation payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Transaction created successfully.',
    schema: toJSONSchema(transactionOutputSchema) as SchemaObject
  })
  @Serialize(transactionOutputSchema)
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createTransactionInputSchema)) data: CreateTransactionInput
  ): Promise<TransactionOutput> {
    return await this.transactionsService.create({
      userId,
      accountId: data.accountId,
      categoryId: data.categoryId,
      cardId: data.cardId,
      description: data.description,
      type: data.type,
      amount: data.amount,
      date: data.date,
      isPaid: data.isPaid,
      schedule: data.schedule
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update transaction',
    description:
      'Updates an existing transaction from the user. Supports schedule conversion (standalone to series, or INSTALLMENT↔RECURRING). For series field edits, scope SINGLE or THIS_AND_FUTURE.'
  })
  @ApiParam({ name: 'id', description: 'Transaction id' })
  @ApiBody({
    schema: toJSONSchema(updateTransactionInputSchema) as SchemaObject,
    description: 'Transaction update payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction updated successfully.',
    schema: toJSONSchema(transactionOutputSchema) as SchemaObject
  })
  @Serialize(transactionOutputSchema)
  async update(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transactionIdParamsSchema)) params: TransactionIdParams,
    @Body(new ZodValidationPipe(updateTransactionInputSchema)) data: UpdateTransactionInput
  ): Promise<TransactionOutput> {
    return await this.transactionsService.update(params.id, userId, {
      accountId: data.accountId,
      categoryId: data.categoryId,
      cardId: data.cardId,
      description: data.description,
      type: data.type,
      amount: data.amount,
      date: data.date,
      scope: data.scope,
      schedule: data.schedule
    });
  }

  @Patch(':id/is-paid')
  @ApiOperation({
    summary: 'Update transaction paid status',
    description: 'Updates only isPaid from a transaction.'
  })
  @ApiParam({ name: 'id', description: 'Transaction id' })
  @ApiBody({
    schema: toJSONSchema(updateTransactionIsPaidInputSchema) as SchemaObject,
    description: 'Transaction paid status payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction paid status updated successfully.',
    schema: toJSONSchema(transactionOutputSchema) as SchemaObject
  })
  @Serialize(transactionOutputSchema)
  async updateIsPaid(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transactionIdParamsSchema)) params: TransactionIdParams,
    @Body(new ZodValidationPipe(updateTransactionIsPaidInputSchema))
    data: UpdateTransactionIsPaidInput
  ): Promise<TransactionOutput> {
    return await this.transactionsService.updateIsPaid(params.id, userId, data.isPaid);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete transaction',
    description:
      'Deletes a transaction from the authenticated user. For series, scope SINGLE or THIS_AND_FUTURE.'
  })
  @ApiParam({ name: 'id', description: 'Transaction id' })
  @ApiQuery({
    name: 'scope',
    required: false,
    enum: ['SINGLE', 'THIS_AND_FUTURE'],
    description: 'Series delete scope (default SINGLE)'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Transaction deleted successfully.'
  })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transactionIdParamsSchema)) params: TransactionIdParams,
    @Query(new ZodValidationPipe(deleteTransactionQueryInputSchema))
    query: DeleteTransactionQueryInput
  ): Promise<void> {
    await this.transactionsService.remove(params.id, userId, query.scope);
  }
}
