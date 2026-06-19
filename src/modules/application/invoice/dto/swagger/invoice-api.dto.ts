import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class InvoiceCustomerSummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;
}

export class InvoiceGarageSummaryDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;
}

export class InvoiceListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoice_number: string;

  @ApiProperty()
  kind: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  total_amount: number;

  @ApiProperty()
  due_amount: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  issued_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  due_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  paid_at: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty({ type: InvoiceCustomerSummaryDto })
  customer: InvoiceCustomerSummaryDto;

  @ApiProperty({ type: InvoiceGarageSummaryDto })
  garage: InvoiceGarageSummaryDto;
}

export class InvoiceCustomerDetailDto extends InvoiceCustomerSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;
}

export class InvoiceGarageDetailDto extends InvoiceGarageSummaryDto {
  @ApiPropertyOptional({ nullable: true })
  contact_email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiPropertyOptional({ nullable: true })
  post_code: string | null;
}

export class InvoiceItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  description: string;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  unit_price: number;

  @ApiProperty()
  total_price: number;
}

export class InvoiceTransactionDto {
  @ApiProperty()
  id: string;

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

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;
}

export class InvoiceDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  invoice_number: string;

  @ApiProperty()
  kind: string;

  @ApiProperty()
  status: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  total_amount: number;

  @ApiProperty()
  due_amount: number;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  issued_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  due_at: Date | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  paid_at: Date | null;

  @ApiProperty({ type: InvoiceCustomerDetailDto })
  customer: InvoiceCustomerDetailDto;

  @ApiProperty({ type: InvoiceGarageDetailDto })
  garage: InvoiceGarageDetailDto;

  @ApiProperty({ type: [InvoiceItemDto] })
  items: InvoiceItemDto[];

  @ApiProperty({ type: [InvoiceTransactionDto] })
  transactions: InvoiceTransactionDto[];
}

export class ListInvoicesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [InvoiceListItemDto] })
  data: InvoiceListItemDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class GetInvoiceResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: InvoiceDetailDto })
  data: InvoiceDetailDto;
}
