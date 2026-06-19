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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  DeleteTransactionResponseDto,
  GetTransactionResponseDto,
  ListTransactionsResponseDto,
} from './dto/swagger/transaction-api.dto';

@ApiTags('Admin Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @apiTypedDoc(
    {
      summary: 'List transactions',
      description: 'ADMIN + JWT. Paginated payment transactions.',
    },
    { type: ListTransactionsResponseDto },
  )
  @Get()
  findAll(@Query() query: QueryTransactionDto) {
    return this.transactionService.findAll(query);
  }

  @apiTypedDoc(
    {
      summary: 'Get transaction',
      description: 'ADMIN + JWT.',
    },
    { type: GetTransactionResponseDto },
  )
  @Get(':transaction_id')
  findOne(
    @Param('transaction_id') transaction_id: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.findOne(transaction_id, query);
  }

  @apiTypedDoc(
    {
      summary: 'Delete transaction',
      description: 'ADMIN + JWT. Soft delete.',
    },
    { type: DeleteTransactionResponseDto },
  )
  @Delete(':transaction_id')
  remove(
    @Param('transaction_id') transaction_id: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.softRemove(transaction_id, query);
  }
}
