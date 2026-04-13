import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserAccountStatus, UserKind } from 'prisma/generated/enums';

export class MeGarageSummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  vts_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  contact_email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;
}

export class AuthMeUserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;

  @ApiPropertyOptional({
    description: 'Present when avatar file exists',
    nullable: true,
  })
  avatar_url?: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiProperty({ enum: UserKind })
  kind: UserKind;

  @ApiProperty({ type: [MeGarageSummaryDto] })
  garages: MeGarageSummaryDto[];

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  email_verified_at: Date | null;

  @ApiProperty({ enum: UserAccountStatus })
  status: UserAccountStatus;
}

export class AuthMeResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AuthMeUserDto })
  data: AuthMeUserDto;
}

export class LoginAuthorizationDto {
  @ApiProperty({ example: 'bearer' })
  type: string;

  @ApiProperty({
    description: 'JWT access token (use as Bearer)',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}

export class LoginUserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty({ enum: UserKind })
  kind: UserKind;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  city: string | null;

  @ApiPropertyOptional({ nullable: true })
  state: string | null;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Logged in successfully' })
  message: string;

  @ApiProperty({ type: LoginAuthorizationDto })
  authorization: LoginAuthorizationDto;

  @ApiProperty({ type: LoginUserDto })
  user: LoginUserDto;
}

export class MessageSuccessDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed' })
  message: string;
}
