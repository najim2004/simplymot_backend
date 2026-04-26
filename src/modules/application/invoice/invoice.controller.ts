import { Controller, Get, Param, Query } from '@nestjs/common';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @ApiSuccessResponse({
    summary: 'List invoices',
    message: 'Invoices fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  getAllInvoices(@User('id') user_id: string, @Query() query: QueryInvoiceDto) {
    return this.invoiceService.getAllInvoices(user_id, query);
  }

  @ApiSuccessResponse({
    summary: 'Get invoice details',
    message: 'Invoice fetched successfully',
    data: { id: 'invoice_id', invoice_number: 'INV-2026-000001' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  getOneInvoice(@Param('id') id: string, @User('id') user_id: string) {
    return this.invoiceService.getOneInvoice(id, user_id);
  }
}
