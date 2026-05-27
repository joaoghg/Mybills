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
  CategoryOutput,
  categoryOutputSchema,
  CreateCategoryInput,
  createCategoryInputSchema,
  ListCategoriesOutput,
  listCategoriesOutputSchema,
  UpdateCategoryInput,
  updateCategoryInputSchema
} from '@mybills/dtos';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { CategoriesService } from './categories.service';
import { CategoryIdParams, categoryIdParamsSchema } from './contracts/category-id-params.contract';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'List categories',
    description: 'Lists all categories of the authenticated user.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Categories listed successfully.',
    schema: toJSONSchema(listCategoriesOutputSchema) as SchemaObject
  })
  @Serialize(listCategoriesOutputSchema)
  async findAll(@CurrentUser('sub') userId: string): Promise<ListCategoriesOutput> {
    return await this.categoriesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get category',
    description: 'Returns one category from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category retrieved successfully.',
    schema: toJSONSchema(categoryOutputSchema) as SchemaObject
  })
  @Serialize(categoryOutputSchema)
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(categoryIdParamsSchema)) params: CategoryIdParams
  ): Promise<CategoryOutput> {
    return await this.categoriesService.findById(params.id, userId);
  }

  @Post()
  @ApiOperation({
    summary: 'Create category',
    description: 'Creates a category for the authenticated user.'
  })
  @ApiBody({
    schema: toJSONSchema(createCategoryInputSchema) as SchemaObject,
    description: 'Category creation payload'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created successfully.',
    schema: toJSONSchema(categoryOutputSchema) as SchemaObject
  })
  @Serialize(categoryOutputSchema)
  async create(
    @CurrentUser('sub') userId: string,
    @Body(new ZodValidationPipe(createCategoryInputSchema)) data: CreateCategoryInput
  ): Promise<CategoryOutput> {
    return await this.categoriesService.create({
      userId,
      name: data.name,
      icon: data.icon
    });
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update category',
    description: 'Updates an existing category from the user.'
  })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiBody({
    schema: toJSONSchema(updateCategoryInputSchema) as SchemaObject,
    description: 'Category update payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated successfully.',
    schema: toJSONSchema(categoryOutputSchema) as SchemaObject
  })
  @Serialize(categoryOutputSchema)
  async update(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(categoryIdParamsSchema)) params: CategoryIdParams,
    @Body(new ZodValidationPipe(updateCategoryInputSchema)) data: UpdateCategoryInput
  ): Promise<CategoryOutput> {
    return await this.categoriesService.update(params.id, userId, data);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete category',
    description: 'Deletes a category from the authenticated user.'
  })
  @ApiParam({ name: 'id', description: 'Category id' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Category deleted successfully.'
  })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param(new ZodValidationPipe(categoryIdParamsSchema)) params: CategoryIdParams
  ): Promise<void> {
    await this.categoriesService.remove(params.id, userId);
  }
}
