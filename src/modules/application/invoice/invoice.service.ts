import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from 'prisma/generated/client';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { PrismaService } from 'src/prisma/prisma.service';
import { QueryInvoiceDto } from './dto/query-invoice.dto';

@Injectable()
export class InvoiceService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllInvoices(user_id: string, query: QueryInvoiceDto) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
    const skip = (page - 1) * limit;
    const where: Prisma.InvoiceWhereInput = {
      AND: [
        this.userInvoiceAccessWhere(user_id),
        query.status ? { status: query.status } : {},
        query.kind ? { kind: query.kind } : {},
        query.search
          ? {
              invoice_number: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            }
          : {},
      ],
    };

    const [invoices, total] = await this.prisma.$transaction([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          invoice_number: true,
          kind: true,
          status: true,
          currency: true,
          total_amount: true,
          due_amount: true,
          issued_at: true,
          due_at: true,
          paid_at: true,
          created_at: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          garage: {
            select: {
              id: true,
              garage_name: true,
            },
          },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return ResponseHelper.success({
      message: 'Invoices fetched successfully',
      data: invoices,
      meta_data: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    });
  }

  async getOneInvoice(id: string, user_id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        ...this.userInvoiceAccessWhere(user_id),
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            phone_number: true,
            address: true,
          },
        },
        garage: {
          select: {
            id: true,
            garage_name: true,
            contact_email: true,
            phone_number: true,
            address: true,
            post_code: true,
          },
        },
        items: {
          orderBy: { created_at: 'asc' },
        },
        transactions: {
          select: {
            id: true,
            kind: true,
            provider: true,
            reference_number: true,
            status: true,
            amount: true,
            currency: true,
            paid_amount: true,
            paid_currency: true,
            created_at: true,
          },
          orderBy: { created_at: 'desc' },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return ResponseHelper.success({
      message: 'Invoice fetched successfully',
      data: invoice,
    });
  }

  private userInvoiceAccessWhere(user_id: string): Prisma.InvoiceWhereInput {
    return {
      OR: [
        { customer_id: user_id },
        {
          garage: {
            owner_id: user_id,
          },
        },
      ],
    };
  }
}
