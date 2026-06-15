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
  ApiOkResponse,
  ApiOperation,
  ApiTags,
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
@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Requires JWT. Returns user profile, garage summary (GARAGE), roles (ADMIN), and active subscription summary (GARAGE).',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: AuthMeResponseDto })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User('id') id: string) {
    return this.authService.me(id);
  }

  @ApiOperation({
    summary: 'Register account',
    description:
      'Public. Send `kind` = DRIVER or GARAGE. Garage registration requires garage fields. Sends email verification OTP.',
  })
  @ApiCreatedResponse({ type: MessageSuccessDto })
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @ApiOperation({
    summary: 'Login',
    description:
      'Public. Email + password. Returns `authorization.access_token` — use as `Authorization: Bearer <token>`.',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@User('id') id: string, @User('email') email: string) {
    return this.authService.login({ id, email });
  }

  @ApiOperation({
    summary: 'Update profile',
    description: 'Requires JWT. Multipart: `name`, `phone_number`, optional `avatar` file.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: 'Jane Doe' },
        phone_number: { type: 'string', example: '+441234567890' },
        avatar: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('avatar', {
      limits: { fileSize: 1024 * 1024 * 20 },
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

  @ApiOperation({
    summary: 'Forgot password',
    description: 'Public. Sends OTP to registered email.',
  })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @ApiOperation({
    summary: 'Validate OTP',
    description: 'Public. Checks OTP validity without consuming it.',
  })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('check-otp')
  checkOTPValidation(@Body() checkOTPValidationDto: CheckOTPValidationDto) {
    return this.authService.checkOTPValidation(checkOTPValidationDto);
  }

  @ApiOperation({
    summary: 'Verify email',
    description: 'Public. Confirms email with OTP/token from registration email.',
  })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Public. Resends email verification OTP.',
  })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('resend-verification-email')
  async resendVerificationEmail(
    @Body() resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    return this.authService.resendVerificationEmail(resendVerificationEmailDto);
  }

  @ApiOperation({
    summary: 'Reset password',
    description: 'Public. Reset password using OTP from forgot-password flow.',
  })
  @ApiOkResponse({ type: MessageSuccessDto })
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiOperation({
    summary: 'Change password',
    description: 'Requires JWT. Current password + new password.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
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

  @ApiOperation({
    summary: 'Request email change',
    description: 'Requires JWT. Sends OTP to the new email address.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @UseGuards(JwtAuthGuard)
  @Post('request-email-change')
  async requestEmailChange(
    @User('id') id: string,
    @Body() requestEmailChangeDto: RequestEmailChangeDto,
  ) {
    return this.authService.requestEmailChange(id, requestEmailChangeDto);
  }

  @ApiOperation({
    summary: 'Confirm email change',
    description: 'Requires JWT. Confirm with OTP sent to new email.',
  })
  @ApiBearerAuth()
  @ApiOkResponse({ type: MessageSuccessDto })
  @UseGuards(JwtAuthGuard)
  @Post('change-email')
  async changeEmail(@Body() changeEmailDto: ChangeEmailDto) {
    return this.authService.changeEmail(changeEmailDto);
  }
}
