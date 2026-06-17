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
  ListTransactionsOutput,
  listTransactionsOutputSchema,
  ListTransactionsQueryInput,
  listTransactionsQueryInputSchema,
  TransactionOutput,
  transactionOutputSchema,
  UpdateTransactionInput,
  updateTransactionInputSchema,
  UpdateTransactionIsPaidInput,
  updateTransactionIsPaidInputSchema
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
      'Lists transactions of the authenticated user with optional filters for month, year, search, category, type, and transfers.'
  })
  @ApiQuery({ name: 'month', required: false, type: Number, description: 'Calendar month (1-12)' })
  @ApiQuery({ name: 'year', required: false, type: Number, description: 'Calendar year' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Description search' })
  @ApiQuery({ name: 'categoryId', required: false, type: String, description: 'Category id' })
  @ApiQuery({
    name: 'type',
    required: false,
    enum: ['INCOME', 'EXPENSE'],
    description: 'Transaction type filter'
  })
  @ApiQuery({
    name: 'includeTransfer',
    required: false,
    type: Boolean,
    description: 'Include transfer transactions (default excludes when false)'
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
      isPaid: data.isPaid
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update transaction',
    description: 'Updates an existing transaction from the user.'
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
      date: data.date
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
    description: 'Deletes a transaction from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Transaction id' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Transaction deleted successfully.'
  })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transactionIdParamsSchema)) params: TransactionIdParams
  ): Promise<void> {
    await this.transactionsService.remove(params.id, userId);
  }
}
