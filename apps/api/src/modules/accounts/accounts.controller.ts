import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toJSONSchema } from 'zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  AccountOutput,
  accountOutputSchema,
  CreateAccountInput,
  createAccountInputSchema,
  ListAccountsOutput,
  listAccountsOutputSchema,
  TransferBalanceInput,
  transferBalanceInputSchema,
  TransferBalanceOutput,
  transferBalanceOutputSchema,
  UpdateAccountInput,
  updateAccountInputSchema
} from '@mybills/dtos';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { AccountsService } from './accounts.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AccountIdParams, accountIdParamsSchema } from './contracts/account-id-params.contract';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly accountsService: AccountsService,
    private readonly transactionsService: TransactionsService
  ) {}

  @Get()
  @ApiOperation({
    summary: 'List accounts',
    description: 'Lists all accounts of the authenticated user.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Accounts listed successfully.',
    schema: toJSONSchema(listAccountsOutputSchema) as SchemaObject
  })
  @Serialize(listAccountsOutputSchema)
  async findAll(@CurrentUser('sub') userId: string): Promise<ListAccountsOutput> {
    return await this.accountsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get account',
    description: 'Returns one account from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Account id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account retrieved successfully.',
    schema: toJSONSchema(accountOutputSchema) as SchemaObject
  })
  @Serialize(accountOutputSchema)
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(accountIdParamsSchema)) params: AccountIdParams
  ): Promise<AccountOutput> {
    return await this.accountsService.findById(params.id, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create account',
    description: 'Creates an account for the authenticated user.'
  })
  @ApiBody({
    schema: toJSONSchema(createAccountInputSchema) as SchemaObject,
    description: 'Account creation payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Account created successfully.',
    schema: toJSONSchema(accountOutputSchema) as SchemaObject
  })
  @Serialize(accountOutputSchema)
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createAccountInputSchema)) data: CreateAccountInput
  ): Promise<AccountOutput> {
    return await this.accountsService.create({
      userId,
      name: data.name,
      balance: data.balance
    });
  }

  @Post('transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transfer account balance',
    description: 'Transfers balance between two accounts from the authenticated user.'
  })
  @ApiBody({
    schema: toJSONSchema(transferBalanceInputSchema) as SchemaObject,
    description: 'Balance transfer payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Balance transferred successfully.',
    schema: toJSONSchema(transferBalanceOutputSchema) as SchemaObject
  })
  @Serialize(transferBalanceOutputSchema)
  async transferBalance(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(transferBalanceInputSchema)) data: TransferBalanceInput
  ): Promise<TransferBalanceOutput> {
    await this.transactionsService.createTransfer({
      userId,
      sourceAccountId: data.sourceAccountId,
      destinationAccountId: data.destinationAccountId,
      amount: data.amount,
      date: new Date().toISOString().slice(0, 10)
    });

    const [sourceAccount, destinationAccount] = await Promise.all([
      this.accountsService.findById(data.sourceAccountId, userId),
      this.accountsService.findById(data.destinationAccountId, userId)
    ]);

    return { sourceAccount, destinationAccount };
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update account',
    description: 'Updates an existing account from the user.'
  })
  @ApiParam({ name: 'id', description: 'Account id' })
  @ApiBody({
    schema: toJSONSchema(updateAccountInputSchema) as SchemaObject,
    description: 'Account update payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Account updated successfully.',
    schema: toJSONSchema(accountOutputSchema) as SchemaObject
  })
  @Serialize(accountOutputSchema)
  async update(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(accountIdParamsSchema)) params: AccountIdParams,
    @Body(new ZodValidationPipe(updateAccountInputSchema)) data: UpdateAccountInput
  ): Promise<AccountOutput> {
    return await this.accountsService.update(params.id, userId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete account',
    description: 'Deletes an account from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Account id' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Account deleted successfully.'
  })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(accountIdParamsSchema)) params: AccountIdParams
  ): Promise<void> {
    await this.accountsService.remove(params.id, userId);
  }
}
