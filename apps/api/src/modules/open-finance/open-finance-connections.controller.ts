import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { toJSONSchema } from 'zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import {
  CreateOpenFinanceConnectionInput,
  createOpenFinanceConnectionInputSchema,
  ListOpenFinanceConnectionsOutput,
  listOpenFinanceConnectionsOutputSchema,
  OpenFinanceConnectionOutput,
  openFinanceConnectionIdParamsSchema,
  openFinanceConnectionOutputSchema,
  OpenFinanceSyncRunIdParams,
  openFinanceSyncRunIdParamsSchema,
  OpenFinanceSyncRunOutput,
  openFinanceSyncRunOutputSchema
} from '@mybills/dtos';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { OpenFinanceConnectionsService } from './open-finance-connections.service';
import { OpenFinanceSyncService } from './open-finance-sync.service';

@ApiTags('Open Finance')
@Controller('open-finance/connections')
export class OpenFinanceConnectionsController {
  constructor(
    private readonly connectionsService: OpenFinanceConnectionsService,
    private readonly syncService: OpenFinanceSyncService
  ) {}

  @Get()
  @ApiOperation({ summary: 'List Open Finance connections' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: toJSONSchema(listOpenFinanceConnectionsOutputSchema) as SchemaObject
  })
  @Serialize(listOpenFinanceConnectionsOutputSchema)
  async list(@CurrentUser('sub') userId: string): Promise<ListOpenFinanceConnectionsOutput> {
    return await this.connectionsService.list(userId);
  }

  @Post()
  @ApiOperation({ summary: 'Register a Connector 200 Item' })
  @ApiBody({ schema: toJSONSchema(createOpenFinanceConnectionInputSchema) as SchemaObject })
  @ApiResponse({
    status: HttpStatus.CREATED,
    schema: toJSONSchema(openFinanceConnectionOutputSchema) as SchemaObject
  })
  @Serialize(openFinanceConnectionOutputSchema)
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createOpenFinanceConnectionInputSchema))
    input: CreateOpenFinanceConnectionInput
  ): Promise<OpenFinanceConnectionOutput> {
    return await this.connectionsService.register(userId, input);
  }

  @Delete(':connectionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect an Open Finance connection' })
  @ApiParam({ name: 'connectionId' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT })
  async disconnect(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(openFinanceConnectionIdParamsSchema))
    params: { connectionId: string }
  ): Promise<void> {
    await this.connectionsService.disconnect(params.connectionId, userId);
  }

  @Post(':connectionId/sync')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Start or coalesce a synchronization run' })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    schema: toJSONSchema(openFinanceSyncRunOutputSchema) as SchemaObject
  })
  @Serialize(openFinanceSyncRunOutputSchema)
  async sync(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(openFinanceConnectionIdParamsSchema))
    params: { connectionId: string }
  ): Promise<OpenFinanceSyncRunOutput> {
    return await this.syncService.enqueueManual(params.connectionId, userId);
  }

  @Get(':connectionId/sync-runs/:syncRunId')
  @ApiOperation({ summary: 'Get a synchronization run' })
  @ApiResponse({
    status: HttpStatus.OK,
    schema: toJSONSchema(openFinanceSyncRunOutputSchema) as SchemaObject
  })
  @Serialize(openFinanceSyncRunOutputSchema)
  async getSyncRun(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(openFinanceSyncRunIdParamsSchema))
    params: OpenFinanceSyncRunIdParams
  ): Promise<OpenFinanceSyncRunOutput> {
    return await this.connectionsService.getSyncRun(params.connectionId, params.syncRunId, userId);
  }
}
