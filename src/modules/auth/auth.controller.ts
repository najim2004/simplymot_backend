import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
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
  LoginUserDto,
} from './dto/auth.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { User } from './decorators/get-user.decorator';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  AuthMeResponseDto,
  LoginResponseDto,
  MessageSuccessDto,
} from './dto/swagger/auth-api.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiBearerAuth()
  @apiTypedDoc(
    {
      summary: 'Get current user profile',
      description:
        'Requires JWT. Returns user profile, garage summary (GARAGE), roles (ADMIN), and active subscription summary (GARAGE).',
    },
    { type: AuthMeResponseDto },
  )
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@User('id') id: string) {
    return this.authService.me(id);
  }

  @apiTypedDoc(
    {
      summary: 'Register account',
      description:
        'Public. Send `kind` = DRIVER or GARAGE. Garage registration requires garage fields. Sends email verification OTP.',
    },
    { type: MessageSuccessDto, status: HttpStatus.CREATED },
  )
  @Post('register')
  async register(@Body() registerUserDto: RegisterUserDto) {
    return this.authService.register(registerUserDto);
  }

  @apiTypedDoc(
    {
      summary: 'Login',
      description:
        'Public. Email + password. Returns `authorization.access_token` — use as `Authorization: Bearer <token>`.',
    },
    { type: LoginResponseDto },
  )
  @ApiBody({ type: LoginUserDto })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  login(@User('id') id: string, @User('email') email: string) {
    return this.authService.login({ id, email });
  }

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
  @apiTypedDoc(
    {
      summary: 'Update profile',
      description:
        'Requires JWT. Multipart: `name`, `phone_number`, optional `avatar` file.',
    },
    { type: MessageSuccessDto },
  )
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

  @apiTypedDoc(
    {
      summary: 'Forgot password',
      description: 'Public. Sends OTP to registered email.',
    },
    { type: MessageSuccessDto },
  )
  @Post('forgot_password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @apiTypedDoc(
    {
      summary: 'Validate OTP',
      description: 'Public. Checks OTP validity without consuming it.',
    },
    { type: MessageSuccessDto },
  )
  @Post('check_otp')
  checkOTPValidation(@Body() checkOTPValidationDto: CheckOTPValidationDto) {
    return this.authService.checkOTPValidation(checkOTPValidationDto);
  }

  @apiTypedDoc(
    {
      summary: 'Verify email',
      description:
        'Public. Confirms email with OTP/token from registration email.',
    },
    { type: MessageSuccessDto },
  )
  @Post('verify_email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @apiTypedDoc(
    {
      summary: 'Resend verification email',
      description: 'Public. Resends email verification OTP.',
    },
    { type: MessageSuccessDto },
  )
  @Post('resend_verification_email')
  async resendVerificationEmail(
    @Body() resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    return this.authService.resendVerificationEmail(resendVerificationEmailDto);
  }

  @apiTypedDoc(
    {
      summary: 'Reset password',
      description:
        'Public. Reset password using OTP from forgot-password flow.',
    },
    { type: MessageSuccessDto },
  )
  @Post('reset_password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @ApiBearerAuth()
  @apiTypedDoc(
    {
      summary: 'Change password',
      description: 'Requires JWT. Current password + new password.',
    },
    { type: MessageSuccessDto },
  )
  @UseGuards(JwtAuthGuard)
  @Post('change_password')
  async changePassword(
    @User('id') id: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword({
      ...changePasswordDto,
      user_id: id,
    });
  }

  @ApiBearerAuth()
  @apiTypedDoc(
    {
      summary: 'Request email change',
      description: 'Requires JWT. Sends OTP to the new email address.',
    },
    { type: MessageSuccessDto },
  )
  @UseGuards(JwtAuthGuard)
  @Post('request_email_change')
  async requestEmailChange(
    @User('id') id: string,
    @Body() requestEmailChangeDto: RequestEmailChangeDto,
  ) {
    return this.authService.requestEmailChange(id, requestEmailChangeDto);
  }

  @ApiBearerAuth()
  @apiTypedDoc(
    {
      summary: 'Confirm email change',
      description: 'Requires JWT. Confirm with OTP sent to new email.',
    },
    { type: MessageSuccessDto },
  )
  @UseGuards(JwtAuthGuard)
  @Post('change_email')
  async changeEmail(@Body() changeEmailDto: ChangeEmailDto) {
    return this.authService.changeEmail(changeEmailDto);
  }
}
