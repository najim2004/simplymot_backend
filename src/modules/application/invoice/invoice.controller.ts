import { Controller, Get, Param, Query } from '@nestjs/common';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  GetInvoiceResponseDto,
  ListInvoicesResponseDto,
} from './dto/swagger/invoice-api.dto';

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @apiTypedDoc(
    {
      summary: 'List invoices',
      description: 'JWT. Customer or garage invoices with pagination.',
    },
    { type: ListInvoicesResponseDto },
  )
  @Get()
  getAllInvoices(@User('id') user_id: string, @Query() query: QueryInvoiceDto) {
    return this.invoiceService.getAllInvoices(user_id, query);
  }

  @apiTypedDoc(
    {
      summary: 'Get invoice',
      description: 'JWT. Full invoice with items and transactions.',
    },
    { type: GetInvoiceResponseDto },
  )
  @Get(':invoice_id')
  getOneInvoice(
    @Param('invoice_id') invoice_id: string,
    @User('id') user_id: string,
  ) {
    return this.invoiceService.getOneInvoice(invoice_id, user_id);
  }
}
