import { UserAccountStatus, UserKind } from 'prisma/generated/client';
import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
export class QueryUserDto {
  @ApiProperty({
    description: 'Search by name or email',
    example: 'John Doe',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Kind',
    example: UserKind.USER,
    enum: UserKind,
  })
  @IsOptional()
  @IsEnum(UserKind)
  kind?: UserKind;

  @ApiProperty({
    description: 'Status',
    example: UserAccountStatus.ACTIVE,
    enum: UserAccountStatus,
  })
  @IsOptional()
  @IsEnum(UserAccountStatus)
  status?: UserAccountStatus;

  @ApiProperty({
    description: 'Page',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiProperty({
    description: 'Limit',
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
