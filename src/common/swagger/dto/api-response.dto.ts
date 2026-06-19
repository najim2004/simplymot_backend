import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ example: 1, minimum: 1 })
  page: number;

  @ApiProperty({ example: 20, minimum: 1 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiPropertyOptional({ example: 5 })
  pages?: number;

  @ApiPropertyOptional({ example: 1 })
  totalPages?: number;
}

export class MessageSuccessDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'Operation completed successfully' })
  message: string;
}

/** Use when API returns `{ success, message, data: null }`. Do not type `data` as `null` — Swagger cannot resolve it. */
export class MessageSuccessWithNullDataDto extends MessageSuccessDto {}

export class IdOnlyDto {
  @ApiProperty({ example: 'clxxxxxxxxxxxxxxxxxxxxxxxx' })
  id: string;
}

export class MessageSuccessWithIdDto extends MessageSuccessDto {
  @ApiProperty({ type: () => IdOnlyDto })
  data: IdOnlyDto;
}
