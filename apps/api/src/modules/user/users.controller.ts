import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { toJSONSchema } from 'zod';
import {
  ListUsersOutput,
  listUsersOutputSchema,
  UpdateUserInput,
  updateUserInputSchema,
  UserOutput,
  userOutputSchema
} from '@mybills/dtos';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { UserIdParams, userIdParamsSchema } from './contracts/user-id-params.contract';

@ApiTags('Users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'List users',
    description: 'Lists all users.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users listed successfully.',
    schema: toJSONSchema(listUsersOutputSchema) as SchemaObject
  })
  @Serialize(listUsersOutputSchema)
  async findAll(): Promise<ListUsersOutput> {
    const users = await this.usersService.findAll();

    return users.map((user) => this.mapToOutput(user));
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get user',
    description: 'Returns one user by id.'
  })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully.',
    schema: toJSONSchema(userOutputSchema) as SchemaObject
  })
  @Serialize(userOutputSchema)
  async findOne(
    @Param(new ZodValidationPipe(userIdParamsSchema)) params: UserIdParams
  ): Promise<UserOutput> {
    const user = await this.usersService.findById(params.id);

    return this.mapToOutput(user);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update user',
    description: 'Updates an existing user.'
  })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiBody({
    schema: toJSONSchema(updateUserInputSchema) as SchemaObject,
    description: 'User update payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User updated successfully.',
    schema: toJSONSchema(userOutputSchema) as SchemaObject
  })
  @Serialize(userOutputSchema)
  async update(
    @Param(new ZodValidationPipe(userIdParamsSchema)) params: UserIdParams,
    @Body(new ZodValidationPipe(updateUserInputSchema)) data: UpdateUserInput
  ): Promise<UserOutput> {
    const user = await this.usersService.update(params.id, data);

    return this.mapToOutput(user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete user',
    description: 'Deletes a user by id.'
  })
  @ApiParam({ name: 'id', description: 'User id' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User deleted successfully.'
  })
  async remove(
    @Param(new ZodValidationPipe(userIdParamsSchema)) params: UserIdParams
  ): Promise<void> {
    await this.usersService.remove(params.id);
  }

  private mapToOutput(user: User): UserOutput {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }
}
