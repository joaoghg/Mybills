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
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { toJSONSchema } from 'zod';
import {
  CreateCreditCardInput,
  createCreditCardInputSchema,
  CreditCardOutput,
  creditCardOutputSchema,
  ListCreditCardsOutput,
  listCreditCardsOutputSchema,
  PayCreditCardInvoiceInput,
  payCreditCardInvoiceInputSchema,
  PayCreditCardInvoiceOutput,
  payCreditCardInvoiceOutputSchema,
  UpdateCreditCardInput,
  updateCreditCardInputSchema
} from '@mybills/dtos';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { CreditCardsService } from './credit-cards.service';
import {
  CreditCardIdParams,
  creditCardIdParamsSchema
} from './contracts/credit-card-id-params.contract';

@ApiTags('CreditCards')
@Controller('credit-cards')
export class CreditCardsController {
  constructor(private readonly creditCardsService: CreditCardsService) {}

  @Get()
  @ApiOperation({
    summary: 'List credit cards',
    description: 'Lists all credit cards of the authenticated user.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credit cards listed successfully.',
    schema: toJSONSchema(listCreditCardsOutputSchema) as SchemaObject
  })
  @Serialize(listCreditCardsOutputSchema)
  async findAll(@CurrentUser('sub') userId: string): Promise<ListCreditCardsOutput> {
    return await this.creditCardsService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get credit card',
    description: 'Returns one credit card from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Credit card id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credit card retrieved successfully.',
    schema: toJSONSchema(creditCardOutputSchema) as SchemaObject
  })
  @Serialize(creditCardOutputSchema)
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(creditCardIdParamsSchema)) params: CreditCardIdParams
  ): Promise<CreditCardOutput> {
    return await this.creditCardsService.findById(params.id, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create credit card',
    description: 'Creates a credit card for the authenticated user.'
  })
  @ApiBody({
    schema: toJSONSchema(createCreditCardInputSchema) as SchemaObject,
    description: 'Credit card creation payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Credit card created successfully.',
    schema: toJSONSchema(creditCardOutputSchema) as SchemaObject
  })
  @Serialize(creditCardOutputSchema)
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createCreditCardInputSchema)) data: CreateCreditCardInput
  ): Promise<CreditCardOutput> {
    return await this.creditCardsService.create({
      userId,
      accountId: data.accountId,
      name: data.name,
      limit: data.limit,
      closingDay: data.closingDay,
      dueDay: data.dueDay
    });
  }

  @Post(':id/pay-invoice')
  @ApiOperation({
    summary: 'Pay credit card invoice',
    description:
      'Pays a closed billing cycle: creates one account EXPENSE and marks card purchases as paid without double debit.'
  })
  @ApiParam({ name: 'id', description: 'Credit card id' })
  @ApiBody({
    schema: toJSONSchema(payCreditCardInvoiceInputSchema) as SchemaObject,
    description: 'Invoice payment payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Invoice paid successfully.',
    schema: toJSONSchema(payCreditCardInvoiceOutputSchema) as SchemaObject
  })
  @Serialize(payCreditCardInvoiceOutputSchema)
  async payInvoice(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(creditCardIdParamsSchema)) params: CreditCardIdParams,
    @Body(new ZodValidationPipe(payCreditCardInvoiceInputSchema)) data: PayCreditCardInvoiceInput
  ): Promise<PayCreditCardInvoiceOutput> {
    return await this.creditCardsService.payInvoice(params.id, userId, data);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update credit card',
    description: 'Updates an existing credit card from the user.'
  })
  @ApiParam({ name: 'id', description: 'Credit card id' })
  @ApiBody({
    schema: toJSONSchema(updateCreditCardInputSchema) as SchemaObject,
    description: 'Credit card update payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credit card updated successfully.',
    schema: toJSONSchema(creditCardOutputSchema) as SchemaObject
  })
  @Serialize(creditCardOutputSchema)
  async update(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(creditCardIdParamsSchema)) params: CreditCardIdParams,
    @Body(new ZodValidationPipe(updateCreditCardInputSchema)) data: UpdateCreditCardInput
  ): Promise<CreditCardOutput> {
    return await this.creditCardsService.update(params.id, userId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete credit card',
    description: 'Deletes a credit card from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Credit card id' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Credit card deleted successfully.'
  })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(creditCardIdParamsSchema)) params: CreditCardIdParams
  ): Promise<void> {
    await this.creditCardsService.remove(params.id, userId);
  }
}
