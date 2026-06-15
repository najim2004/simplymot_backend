import {
  Controller,
  Delete,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const TRANSACTION_EXAMPLE = {
  id: 'cltxn001',
  user_id: 'cluser001',
  entity_id: 'clbooking001',
  kind: 'PAYMENT',
  provider: 'STRIPE',
  reference_number: 'pi_xxx',
  status: 'COMPLETED',
  amount: 45.0,
  currency: 'GBP',
  paid_amount: 45.0,
  paid_currency: 'GBP',
  raw_status: 'succeeded',
  booking_id: 'clbooking001',
  created_at: '2026-06-20T10:05:00.000Z',
  updated_at: '2026-06-20T10:05:00.000Z',
  user: {
    id: 'cluser001',
    email: 'john@example.com',
    name: 'John Driver',
    kind: 'DRIVER',
  },
};

@ApiTags('Admin Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @ApiOperation({
    summary: 'List transactions',
    description: 'ADMIN + JWT. Paginated payment transactions.',
  })
  @ApiSuccessResponse({
    message: 'Transactions fetched successfully',
    data: [TRANSACTION_EXAMPLE],
    metaData: { total: 50, page: 1, limit: 10, pages: 5 },
  })
  @Get()
  findAll(@Query() query: QueryTransactionDto) {
    return this.transactionService.findAll(query);
  }

  @ApiOperation({
    summary: 'Get transaction',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Transaction fetched successfully',
    data: TRANSACTION_EXAMPLE,
  })
  @Get(':transaction_id')
  findOne(
    @Param('transaction_id') transaction_id: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.findOne(transaction_id, query);
  }

  @ApiOperation({
    summary: 'Delete transaction',
    description: 'ADMIN + JWT. Soft delete.',
  })
  @ApiSuccessResponse({
    message: 'Transaction deleted successfully',
    data: { id: 'cltxn001' },
  })
  @Delete(':transaction_id')
  remove(
    @Param('transaction_id') transaction_id: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.softRemove(transaction_id, query);
  }
}
