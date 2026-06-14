import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly listSelect = {
    id: true,
    user_id: true,
    entity_id: true,
    kind: true,
    provider: true,
    reference_number: true,
    status: true,
    amount: true,
    currency: true,
    paid_amount: true,
    paid_currency: true,
    raw_status: true,
    booking_id: true,
    created_at: true,
    updated_at: true,
    user: {
      select: {
        id: true,
        email: true,
        name: true,
        kind: true,
      },
    },
  } satisfies Prisma.PaymentTransactionSelect;

  private userWhereFromQuery(
    query: Pick<QueryTransactionDto, 'user_id' | 'user_kind'>,
  ) {
    const { user_id, user_kind } = query;
    if (!user_id && !user_kind) return undefined;
    return {
      ...(user_id ? { id: user_id } : {}),
      ...(user_kind ? { kind: user_kind } : {}),
    } satisfies Prisma.UserWhereInput;
  }

  async findAll(query: QueryTransactionDto) {
    const {
      page = 1,
      limit = 10,
      status,
      kind,
      search,
      user_id,
      user_kind,
    } = query;
    const where: Prisma.PaymentTransactionWhereInput = {
      deleted_at: null,
    };

    if (status) where.status = status;
    if (kind) where.kind = kind;
    const userWhere = this.userWhereFromQuery({ user_id, user_kind });
    if (userWhere) where.user = { is: userWhere };
    if (search?.trim()) {
      where.reference_number = {
        contains: search.trim(),
        mode: 'insensitive',
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.paymentTransaction.findMany({
        where,
        select: this.listSelect,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.paymentTransaction.count({ where }),
    ]);

    return ResponseHelper.success({
      message: 'Transactions fetched successfully',
      data: items,
      meta_data: {
        total,
        page,
        limit,
        filters: { status, kind, search, user_id, user_kind },
      },
    });
  }

  async findOne(
    id: string,
    query: Pick<QueryTransactionDto, 'user_id' | 'user_kind'>,
  ) {
    const userWhere = this.userWhereFromQuery(query);
    const row = await this.prisma.paymentTransaction.findFirst({
      where: {
        id,
        deleted_at: null,
        ...(userWhere ? { user: { is: userWhere } } : {}),
      },
      select: this.listSelect,
    });

    if (!row) {
      throw new NotFoundException('Transaction not found');
    }

    return ResponseHelper.success({
      message: 'Transaction fetched successfully',
      data: row,
    });
  }

  async softRemove(
    id: string,
    query: Pick<QueryTransactionDto, 'user_id' | 'user_kind'>,
  ) {
    const userWhere = this.userWhereFromQuery(query);
    const existing = await this.prisma.paymentTransaction.findFirst({
      where: {
        id,
        deleted_at: null,
        ...(userWhere ? { user: { is: userWhere } } : {}),
      },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('Transaction not found');
    }

    await this.prisma.paymentTransaction.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return ResponseHelper.success({
      message: 'Transaction deleted successfully',
      data: { id },
    });
  }
}
