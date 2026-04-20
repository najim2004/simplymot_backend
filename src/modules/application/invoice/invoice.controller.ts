import { Controller, Get, Param, Query } from '@nestjs/common';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceService } from './invoice.service';

@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  getAllInvoices(
    @User('id') user_id: string,
    @Query() query: QueryInvoiceDto,
  ) {
    return this.invoiceService.getAllInvoices(user_id, query);
  }

  @Get(':id')
  getOneInvoice(@Param('id') id: string, @User('id') user_id: string) {
    return this.invoiceService.getOneInvoice(id, user_id);
  }
}
