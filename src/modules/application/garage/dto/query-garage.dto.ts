import { IsString, IsOptional, IsDate } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class GetGarageHolidaysQueryDto {
  @ApiPropertyOptional({
    description: 'Year',
    example: '2022',
  })
  @IsString()
  @IsOptional()
  year?: string;
}
// export

export class GetGarageSlotsQueryDto {
  @ApiPropertyOptional({
    description: 'Date',
    example: '2022-01-01',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date?: Date;
}

export class BlockUnblockSlotsDto {
  @ApiPropertyOptional({
    description: 'Id',
    example: 'cuid',
  })
  @IsOptional()
  @IsString()
  id?: string;

  @ApiPropertyOptional({
    description: 'Start Time',
    example: '2026-04-20T13:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  start_time?: Date;

  @ApiPropertyOptional({
    description: 'End Time',
    example: '2026-04-20T14:00:00.000Z',
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  end_time?: Date;

  @ApiPropertyOptional({
    description: 'Description',
    example: 'Blocked',
  })
  @IsOptional()
  @IsString()
  description?: string;
}
