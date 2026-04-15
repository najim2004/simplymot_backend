import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

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
