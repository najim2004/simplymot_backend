import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import {
  ChangeEmailDto,
  ChangePasswordDto,
  RegisterUserDto,
  ForgotPasswordDto,
  RequestEmailChangeDto,
  ResendVerificationEmailDto,
  ResetPasswordDto,
  VerifyEmailDto,
  CheckOTPValidationDto,
} from './dto/auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/get-user.decorator';
import {
  AuthMeResponseDto,
  LoginResponseDto,
  MessageSuccessDto,
} from './dto/swagger/auth-api.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'Current user profile',
    description:
      'Returns the authenticated user with optional garage summary and avatar URL.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthMeResponseDto })
  @ApiUnauthorizedResponse()
  @ApiNotFoundResponse({ description: 'User no longer exists' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User('id') id: string) {
    return this.authService.me(id);
  }

  @ApiOperation({ summary: 'Register a new account' })
  @ApiCreatedResponse({
    description: 'Registration accepted; OTP sent to email',
    type: MessageSuccessDto,
  })
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @ApiOperation({
    summary: 'Login with email and password',
    description: 'Returns a JWT access token and a normalized user payload.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials or account state',
  })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@User('id') id: string, @User('email') email: string) {
    return this.authService.login({ id, email });
  }

  @ApiOperation({
    summary: 'Update profile (multipart)',
    description:
      'Send `name`, `phone_number` as form fields; optional `avatar` file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jane Doe' },
        phone_number: { type: 'string', example: '+8801712345678' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: {
        fileSize: 1024 * 1024 * 20,
      },
      storage: memoryStorage(),
    }),
  )
  async updateUser(
    @User('id') id: string,
    @Body() data: UpdateUserDto,
    @UploadedFile() avatar: Express.Multer.File,
  ) {
    return this.authService.updateUser(id, data, avatar);
  }

  @ApiOperation({ summary: 'Request password recovery OTP' })
  @ApiOkResponse({ type: MessageSuccessDto })
  @ApiNotFoundResponse({ description: 'Email not registered' })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({ summary: 'Validate OTP without consuming it' })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('check-otp')
  checkOTPValidation(@Body() checkOTPValidationDto: CheckOTPValidationDto) {
    return this.authService.checkOTPValidation(checkOTPValidationDto);
  }

  @ApiOperation({ summary: 'Verify email with OTP/token' })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @ApiOperation({ summary: 'Resend email verification OTP' })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('resend-verification-email')
  async resendVerificationEmail(
    @Body() resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    return this.authService.resendVerificationEmail(resendVerificationEmailDto);
  }

  @ApiOperation({ summary: 'Reset password using OTP' })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @ApiUnauthorizedResponse()
  @ApiBadRequestResponse({ description: 'Current password incorrect' })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @User('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword({
      ...changePasswordDto,
      user_id: id,
    });
  }

  @ApiOperation({ summary: 'Request email change OTP' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @User('id') id: string,
    @Body() requestEmailChangeDto: RequestEmailChangeDto,
  ) {
    return this.authService.requestEmailChange(id, requestEmailChangeDto);
  }

  @ApiOperation({ summary: 'Confirm email change with OTP' })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @ApiUnauthorizedResponse()
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(@Body() changeEmailDto: ChangeEmailDto) {
    return this.authService.changeEmail(changeEmailDto);
  }
}
