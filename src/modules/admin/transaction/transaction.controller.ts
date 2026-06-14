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

@ApiTags('Transaction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/transactions')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @ApiOperation({ summary: 'List transactions (paginated)' })
  @ApiSuccessResponse({
    summary: 'List transactions',
    message: 'Transactions fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  findAll(@Query() query: QueryTransactionDto) {
    return this.transactionService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one transaction by id' })
  @ApiSuccessResponse({
    summary: 'Get one transaction by id',
    message: 'Transaction fetched successfully',
    data: { id: 'transaction_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':transaction_id')
  findOne(
    @Param('transaction_id') transaction_id: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.findOne(transaction_id, query);
  }

  @ApiOperation({ summary: 'Soft-delete a transaction' })
  @ApiSuccessResponse({
    summary: 'Soft-delete a transaction',
    message: 'Transaction deleted successfully',
    data: { id: 'transaction_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':transaction_id')
  remove(
    @Param('transaction_id') transaction_id: string,
    @Query() query: QueryTransactionDto,
  ) {
    return this.transactionService.softRemove(transaction_id, query);
  }
}
