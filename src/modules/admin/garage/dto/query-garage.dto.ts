import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsNumber,
  IsDate,
} from 'class-validator';
import { UserAccountStatus } from '@generated/prisma/enums';

export class QueryGarageDto {
  @IsOptional()
  @ApiProperty({
    description: 'Page number',
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @IsOptional()
  @ApiProperty({
    description: 'Limit number',
    example: 10,
  })
  @Type(() => Number)
  @IsNumber()
  limit?: number;

  @IsOptional()
  @ApiProperty({
    description: 'From date',
    example: new Date(),
  })
  @Type(() => Date)
  @IsDate()
  from_date?: Date;

  @IsOptional()
  @ApiProperty({
    description: 'To date',
    example: new Date(),
  })
  @Type(() => Date)
  @IsDate()
  to_date?: Date;

  @IsOptional()
  @ApiProperty({
    description: 'Search',
    example: 'John Doe',
  })
  @IsEnum(UserAccountStatus)
  @IsString()
  search?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Status',
    example: UserAccountStatus.ACTIVE,
    enum: UserAccountStatus,
  })
  @IsEnum(UserAccountStatus)
  status?: UserAccountStatus;
}
