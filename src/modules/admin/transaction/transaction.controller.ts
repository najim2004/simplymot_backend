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

@ApiTags('Transaction')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/transaction')
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @ApiOperation({ summary: 'List transactions (paginated)' })
  @Get()
  findAll(@Query() query: QueryTransactionDto) {
    return this.transactionService.findAll(query);
  }

  @ApiOperation({ summary: 'Get one transaction by id' })
  @Get(':id')
  findOne(@Param('id') id: string, @Query() query: QueryTransactionDto) {
    return this.transactionService.findOne(id, query);
  }

  @ApiOperation({ summary: 'Soft-delete a transaction' })
  @Delete(':id')
  remove(@Param('id') id: string, @Query() query: QueryTransactionDto) {
    return this.transactionService.softRemove(id, query);
  }
}
