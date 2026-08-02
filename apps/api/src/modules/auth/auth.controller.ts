import { Body, Controller, Get, Post, UsePipes, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { Serialize } from 'src/common/decorators/serialize.decorator';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import {
  signUpInputSchema,
  signInInputSchema,
  SignUpInput,
  SignInInput,
  signUpOutputSchema,
  signInOutputSchema,
  SignUpOutput,
  SignInOutput,
  refreshTokenInputSchema,
  refreshTokenOutputSchema,
  RefreshTokenInput,
  RefreshTokenOutput,
  UserOutput,
  userOutputSchema
} from '@mybills/dtos';
import { toJSONSchema } from 'zod';
import { SchemaObject } from '@nestjs/swagger/dist/interfaces/open-api-spec.interface';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Creates a new user',
    description: 'Creates a new user with the provided data.'
  })
  @ApiBody({
    schema: toJSONSchema(signUpInputSchema) as SchemaObject,
    description: 'User registration data'
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User created successfully.',
    schema: toJSONSchema(signUpOutputSchema) as SchemaObject
  })
  @Serialize(signUpOutputSchema)
  @UsePipes(new ZodValidationPipe(signUpInputSchema))
  async register(@Body() data: SignUpInput): Promise<SignUpOutput> {
    return this.authService.signUp(data);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Authenticates a user and returns a JWT token.' })
  @ApiBody({
    schema: toJSONSchema(signInInputSchema) as SchemaObject,
    description: 'User login credentials'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User authenticated successfully.',
    schema: toJSONSchema(signInOutputSchema) as SchemaObject
  })
  @Serialize(signInOutputSchema)
  @UsePipes(new ZodValidationPipe(signInInputSchema))
  async login(@Body() data: SignInInput): Promise<SignInOutput> {
    return this.authService.signIn(data);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh tokens',
    description: 'Rotates the refresh token and returns a new token pair.'
  })
  @ApiBody({
    schema: toJSONSchema(refreshTokenInputSchema) as SchemaObject,
    description: 'Refresh token payload'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tokens refreshed successfully.',
    schema: toJSONSchema(refreshTokenOutputSchema) as SchemaObject
  })
  @Serialize(refreshTokenOutputSchema)
  @UsePipes(new ZodValidationPipe(refreshTokenInputSchema))
  async refresh(@Body() data: RefreshTokenInput): Promise<RefreshTokenOutput> {
    return this.authService.refreshTokens(data);
  }

  @Get('me')
  @ApiOperation({
    summary: 'Get current user',
    description: 'Returns the authenticated user profile.'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current user retrieved successfully.',
    schema: toJSONSchema(userOutputSchema) as SchemaObject
  })
  @Serialize(userOutputSchema)
  async me(@CurrentUser('sub') userId: string): Promise<UserOutput> {
    return this.authService.getMe(userId);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout',
    description: 'Clears the stored refresh token for the authenticated user.'
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'User logged out successfully.'
  })
  async logout(@CurrentUser('sub') userId: string): Promise<void> {
    await this.authService.logout(userId);
  }
}
