import { Type } from 'class-transformer';
import { IsOptional, IsString, IsNumber, IsDate } from 'class-validator';
export class QueryMotHistoryDto {
  @IsOptional()
  @IsString()
  search: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_from: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  date_to: Date;
}
