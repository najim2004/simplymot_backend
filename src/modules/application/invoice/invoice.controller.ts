import { Controller, Get, Param, Query } from '@nestjs/common';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { QueryInvoiceDto } from './dto/query-invoice.dto';
import { InvoiceService } from './invoice.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const INVOICE_LIST_ITEM = {
  id: 'clinv001',
  invoice_number: 'INV-2026-000001',
  kind: 'BOOKING',
  status: 'PAID',
  currency: 'GBP',
  total_amount: 45.0,
  due_amount: 0,
  issued_at: '2026-06-20T10:00:00.000Z',
  due_at: '2026-06-27T10:00:00.000Z',
  paid_at: '2026-06-20T10:05:00.000Z',
  created_at: '2026-06-20T10:00:00.000Z',
  customer: { id: 'cluser001', name: 'John Driver', email: 'john@example.com' },
  garage: { id: 'clgarage001', garage_name: 'City MOT Centre' },
};

const INVOICE_LIST_META = { total: 3, page: 1, limit: 10, pages: 1 };

const INVOICE_DETAIL = {
  id: 'clinv001',
  invoice_number: 'INV-2026-000001',
  kind: 'BOOKING',
  status: 'PAID',
  currency: 'GBP',
  total_amount: 45.0,
  due_amount: 0,
  issued_at: '2026-06-20T10:00:00.000Z',
  due_at: '2026-06-27T10:00:00.000Z',
  paid_at: '2026-06-20T10:05:00.000Z',
  customer: {
    id: 'cluser001',
    name: 'John Driver',
    email: 'john@example.com',
    phone_number: '+441112223333',
    address: '1 Driver Lane',
  },
  garage: {
    id: 'clgarage001',
    garage_name: 'City MOT Centre',
    contact_email: 'contact@citymot.co.uk',
    phone_number: '+441234567890',
    address: '12 High Street',
    post_code: 'SW1A 1AA',
  },
  items: [
    {
      id: 'clinvitem001',
      description: 'MOT Test',
      quantity: 1,
      unit_price: 45.0,
      total_price: 45.0,
    },
  ],
  transactions: [
    {
      id: 'cltxn001',
      kind: 'PAYMENT',
      provider: 'STRIPE',
      reference_number: 'pi_xxx',
      status: 'COMPLETED',
      amount: 45.0,
      currency: 'GBP',
      paid_amount: 45.0,
      paid_currency: 'GBP',
      created_at: '2026-06-20T10:05:00.000Z',
    },
  ],
};

@ApiTags('Invoice')
@ApiBearerAuth()
@Controller('invoice')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @ApiOperation({
    summary: 'List invoices',
    description: 'JWT. Customer or garage invoices with pagination.',
  })
  @ApiSuccessResponse({
    message: 'Invoices fetched successfully',
    data: [INVOICE_LIST_ITEM],
    metaData: INVOICE_LIST_META,
  })
  @Get()
  getAllInvoices(@User('id') user_id: string, @Query() query: QueryInvoiceDto) {
    return this.invoiceService.getAllInvoices(user_id, query);
  }

  @ApiOperation({
    summary: 'Get invoice',
    description: 'JWT. Full invoice with items and transactions.',
  })
  @ApiSuccessResponse({
    message: 'Invoice fetched successfully',
    data: INVOICE_DETAIL,
  })
  @Get(':id')
  getOneInvoice(@Param('id') id: string, @User('id') user_id: string) {
    return this.invoiceService.getOneInvoice(id, user_id);
  }
}
