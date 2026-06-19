import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IdOnlyDto,
  PaginationMetaDto,
} from 'src/common/swagger/dto/api-response.dto';

export class TransactionUserDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiProperty()
  kind: string;
}

export class TransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  user_id: string;

  @ApiPropertyOptional({ nullable: true })
  entity_id: string | null;

  @ApiProperty()
  kind: string;

  @ApiProperty()
  provider: string;

  @ApiPropertyOptional({ nullable: true })
  reference_number: string | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  amount: number;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  paid_amount: number;

  @ApiProperty()
  paid_currency: string;

  @ApiPropertyOptional({ nullable: true })
  raw_status: string | null;

  @ApiPropertyOptional({ nullable: true })
  booking_id: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updated_at: Date;

  @ApiProperty({ type: TransactionUserDto })
  user: TransactionUserDto;
}

export class ListTransactionsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [TransactionDto] })
  data: TransactionDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class GetTransactionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: TransactionDto })
  data: TransactionDto;
}

export class DeleteTransactionResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: IdOnlyDto })
  data: IdOnlyDto;
}
