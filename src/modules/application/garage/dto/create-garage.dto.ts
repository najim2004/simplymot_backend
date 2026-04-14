import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsOptional, IsDate, IsNotEmpty } from 'class-validator';

export class CreateHolidayDto {
  @ApiProperty({
    description: 'Holiday date',
    example: '2022-01-01',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty({
    description: 'Holiday name',
    example: 'Holiday',
  })
  @IsOptional()
  @IsString()
  name?: string;
}

export class CreateBreakTimeDto {
  @ApiProperty({
    description: 'Break time start',
    example: '2022-01-01',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  starts_at: Date;

  @ApiProperty({
    description: 'Break time end',
    example: '2022-01-01',
  })
  @IsNotEmpty()
  @Type(() => Date)
  @IsDate()
  ends_at: Date;

  @ApiProperty({
    description: 'Break time description',
    example: 'Break time',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
