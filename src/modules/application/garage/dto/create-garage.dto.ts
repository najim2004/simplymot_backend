import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsString,
  IsOptional,
  IsDate,
  IsNotEmpty,
  Matches,
} from 'class-validator';

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
    description: 'Break time start in HH:mm format',
    example: '13:00',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'start_time must be in HH:mm format',
  })
  start_time: string;

  @ApiProperty({
    description: 'Break time end in HH:mm format',
    example: '14:00',
  })
  @IsNotEmpty()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'end_time must be in HH:mm format',
  })
  end_time: string;

  @ApiProperty({
    description: 'Break time description',
    example: 'Lunch Break',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
