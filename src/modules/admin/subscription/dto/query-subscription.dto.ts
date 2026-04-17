import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { SubscriptionPlanStatus } from 'prisma/generated/enums';

export class QuerySubscriptionPlanDto {
  @ApiProperty({
    description: 'Page number',
    example: 1,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number = 1;

  @ApiProperty({
    description: 'Limit number',
    example: 10,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number = 10;

  @ApiProperty({
    description: 'Search',
    example: 'Premium',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiProperty({
    description: 'Status',
    example: SubscriptionPlanStatus.ACTIVE,
    enum: SubscriptionPlanStatus,
  })
  @IsOptional()
  @IsEnum(SubscriptionPlanStatus)
  status?: SubscriptionPlanStatus;
}
