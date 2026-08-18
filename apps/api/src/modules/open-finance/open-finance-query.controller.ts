import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toJSONSchema } from 'zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  InvestmentOutput,
  ListInvestmentTransactionsOutput,
  ListInvestmentsOutput,
  ListProviderBillsOutput,
  ResetOpenFinanceOverridesInput,
  investmentIdParamsSchema,
  investmentOutputSchema,
  listInvestmentTransactionsOutputSchema,
  listInvestmentsOutputSchema,
  listProviderBillsOutputSchema,
  resetOpenFinanceOverridesInputSchema
} from '@mybills/dtos';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { OpenFinanceQueryService } from './open-finance-query.service';
import z from 'zod';

const creditCardIdParamsSchema = z.object({ creditCardId: z.uuid() });
const accountIdParamsSchema = z.object({ accountId: z.uuid() });
const transactionIdParamsSchema = z.object({ transactionId: z.uuid() });

@ApiTags('Open Finance')
@Controller('open-finance')
export class OpenFinanceQueryController {
  constructor(private readonly queryService: OpenFinanceQueryService) {}

  @Get('investments')
  @Serialize(listInvestmentsOutputSchema)
  @ApiResponse({
    status: HttpStatus.OK,
    schema: toJSONSchema(listInvestmentsOutputSchema) as SchemaObject
  })
  async listInvestments(@CurrentUser('sub') userId: string): Promise<ListInvestmentsOutput> {
    return await this.queryService.listInvestments(userId);
  }

  @Get('investments/:investmentId')
  @Serialize(investmentOutputSchema)
  async getInvestment(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(investmentIdParamsSchema)) params: { investmentId: string }
  ): Promise<InvestmentOutput> {
    return await this.queryService.getInvestment(params.investmentId, userId);
  }

  @Get('investments/:investmentId/transactions')
  @Serialize(listInvestmentTransactionsOutputSchema)
  async listInvestmentTransactions(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(investmentIdParamsSchema)) params: { investmentId: string }
  ): Promise<ListInvestmentTransactionsOutput> {
    return await this.queryService.listInvestmentTransactions(params.investmentId, userId);
  }

  @Get('credit-cards/:creditCardId/bills')
  @Serialize(listProviderBillsOutputSchema)
  async listBills(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(creditCardIdParamsSchema)) params: { creditCardId: string }
  ): Promise<ListProviderBillsOutput> {
    return await this.queryService.listBills(params.creditCardId, userId);
  }

  @Post('projections/accounts/:accountId/reset-overrides')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Restore selected account fields from the provider record' })
  @ApiBody({ schema: toJSONSchema(resetOpenFinanceOverridesInputSchema) as SchemaObject })
  async resetAccount(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(accountIdParamsSchema)) params: { accountId: string },
    @Body(new ZodValidationPipe(resetOpenFinanceOverridesInputSchema))
    input: ResetOpenFinanceOverridesInput
  ): Promise<void> {
    await this.queryService.resetAccountOverrides(params.accountId, userId, input);
  }

  @Post('projections/transactions/:transactionId/reset-overrides')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetTransaction(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(transactionIdParamsSchema)) params: { transactionId: string },
    @Body(new ZodValidationPipe(resetOpenFinanceOverridesInputSchema))
    input: ResetOpenFinanceOverridesInput
  ): Promise<void> {
    await this.queryService.resetTransactionOverrides(params.transactionId, userId, input);
  }

  @Post('projections/credit-cards/:creditCardId/reset-overrides')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetCreditCard(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(creditCardIdParamsSchema)) params: { creditCardId: string },
    @Body(new ZodValidationPipe(resetOpenFinanceOverridesInputSchema))
    input: ResetOpenFinanceOverridesInput
  ): Promise<void> {
    await this.queryService.resetCreditCardOverrides(params.creditCardId, userId, input);
  }
}
