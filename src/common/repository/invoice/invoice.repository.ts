import { Injectable, Logger } from '@nestjs/common';
import {
  InvoiceKind,
  InvoiceStatus,
  PaymentTransactionKind,
  PaymentTransactionStatus,
} from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import { PrismaService } from 'src/prisma/prisma.service';

export type SubscriptionPaymentContext = {
  subscriptionId: string;
  userId: string;
  planId: string;
  planName: string;
  garageId: string | null;
  stripeInvoiceId: string;
  amountPaid: number;
  currency: string;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  hostedInvoiceUrl: string | null;
  invoicePdfUrl: string | null;
  billingReason: string | null;
  membershipPeriodLabel: string | null;
  paidAt: Date;
  issuedAt: Date;
};

@Injectable()
export class InvoiceRepository {
  private readonly logger = new Logger(InvoiceRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByProviderInvoiceId(providerInvoiceId: string) {
    return this.prisma.invoice.findFirst({
      where: { provider_invoice_id: providerInvoiceId },
      select: { id: true },
    });
  }

  async findTransactionByReference(referenceNumber: string) {
    return this.prisma.paymentTransaction.findFirst({
      where: {
        reference_number: referenceNumber,
        deleted_at: null,
      },
      select: { id: true, invoice_id: true, status: true },
    });
  }

  async generateInvoiceNumber(
    tx: Prisma.TransactionClient,
    forDate = new Date(),
  ): Promise<string> {
    const datePrefix = `INV-${forDate.getFullYear()}${String(
      forDate.getMonth() + 1,
    ).padStart(2, '0')}${String(forDate.getDate()).padStart(2, '0')}`;

    const latest = await tx.invoice.findFirst({
      where: { invoice_number: { startsWith: datePrefix } },
      orderBy: { invoice_number: 'desc' },
      select: { invoice_number: true },
    });

    let sequence = 1;
    if (latest) {
      const parts = latest.invoice_number.split('-');
      const lastSequence = parseInt(parts[parts.length - 1] || '0', 10);
      if (!Number.isNaN(lastSequence)) {
        sequence = lastSequence + 1;
      }
    }

    return `${datePrefix}-${String(sequence).padStart(4, '0')}`;
  }

  async recordSubscriptionPayment(ctx: SubscriptionPaymentContext) {
    const existingTransaction = await this.findTransactionByReference(
      ctx.stripeInvoiceId,
    );

    if (existingTransaction?.status === PaymentTransactionStatus.PAID) {
      return {
        invoiceId: existingTransaction.invoice_id,
        transactionId: existingTransaction.id,
        created: false,
      };
    }

    if (existingTransaction?.status === PaymentTransactionStatus.FAILED) {
      const existingInvoice = await this.findByProviderInvoiceId(
        ctx.stripeInvoiceId,
      );

      let invoiceId = existingInvoice?.id ?? existingTransaction.invoice_id;

      if (!invoiceId) {
        const created = await this.createSubscriptionInvoice(ctx);
        invoiceId = created.invoiceId;
      }

      await this.prisma.paymentTransaction.update({
        where: { id: existingTransaction.id },
        data: {
          status: PaymentTransactionStatus.PAID,
          amount: ctx.amountPaid,
          currency: ctx.currency,
          paid_amount: ctx.amountPaid,
          paid_currency: ctx.currency,
          raw_status: 'succeeded',
          invoice_id: invoiceId,
        },
      });

      return {
        invoiceId,
        transactionId: existingTransaction.id,
        created: true,
        recovered: true,
      };
    }

    if (existingTransaction) {
      return {
        invoiceId: existingTransaction.invoice_id,
        transactionId: existingTransaction.id,
        created: false,
      };
    }

    const existingInvoice = await this.findByProviderInvoiceId(
      ctx.stripeInvoiceId,
    );
    if (existingInvoice) {
      this.logger.debug(
        `Invoice already exists for Stripe invoice ${ctx.stripeInvoiceId}`,
      );
      return {
        invoiceId: existingInvoice.id,
        transactionId: null,
        created: false,
      };
    }

    return this.createSubscriptionInvoice(ctx);
  }

  private async createSubscriptionInvoice(ctx: SubscriptionPaymentContext) {
    return this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.generateInvoiceNumber(tx, ctx.paidAt);

      const invoice = await tx.invoice.create({
        data: {
          invoice_number: invoiceNumber,
          kind: InvoiceKind.SUBSCRIPTION,
          status: InvoiceStatus.PAID,
          entity_type: 'Subscription',
          entity_id: ctx.subscriptionId,
          customer_id: ctx.userId,
          garage_id: ctx.garageId,
          currency: ctx.currency.toUpperCase(),
          subtotal_amount: ctx.subtotalAmount,
          discount_amount: ctx.discountAmount,
          tax_amount: ctx.taxAmount,
          total_amount: ctx.amountPaid,
          paid_amount: ctx.amountPaid,
          due_amount: 0,
          issued_at: ctx.issuedAt,
          due_at: ctx.issuedAt,
          paid_at: ctx.paidAt,
          provider: 'stripe',
          provider_invoice_id: ctx.stripeInvoiceId,
          provider_hosted_url: ctx.hostedInvoiceUrl,
          provider_pdf_url: ctx.invoicePdfUrl,
          notes: ctx.membershipPeriodLabel
            ? `Membership period: ${ctx.membershipPeriodLabel}`
            : null,
          metadata: {
            billing_reason: ctx.billingReason,
            membership_period: ctx.membershipPeriodLabel,
          },
          items: {
            create: {
              title: ctx.planName,
              description: ctx.membershipPeriodLabel,
              item_type: 'SubscriptionPlan',
              item_id: ctx.planId,
              quantity: 1,
              unit_amount: ctx.subtotalAmount,
              discount_amount: ctx.discountAmount,
              tax_amount: ctx.taxAmount,
              total_amount: ctx.amountPaid,
            },
          },
        },
      });

      const paymentTransaction = await tx.paymentTransaction.create({
        data: {
          user_id: ctx.userId,
          entity_id: ctx.subscriptionId,
          kind: PaymentTransactionKind.SUBSCRIPTION,
          provider: 'stripe',
          reference_number: ctx.stripeInvoiceId,
          status: PaymentTransactionStatus.PAID,
          amount: ctx.amountPaid,
          currency: ctx.currency,
          paid_amount: ctx.amountPaid,
          paid_currency: ctx.currency,
          raw_status: 'succeeded',
          invoice_id: invoice.id,
        },
      });

      return {
        invoiceId: invoice.id,
        transactionId: paymentTransaction.id,
        created: true,
      };
    });
  }

  async recordSubscriptionPaymentFailure(ctx: {
    subscriptionId: string;
    userId: string;
    stripeInvoiceId: string;
    amountDue: number;
    currency: string;
    failureReason?: string | null;
  }) {
    const existingTransaction = await this.findTransactionByReference(
      ctx.stripeInvoiceId,
    );
    if (existingTransaction) {
      if (existingTransaction.status === PaymentTransactionStatus.PAID) {
        return {
          transactionId: existingTransaction.id,
          created: false,
        };
      }

      await this.prisma.paymentTransaction.update({
        where: { id: existingTransaction.id },
        data: {
          status: PaymentTransactionStatus.FAILED,
          amount: ctx.amountDue,
          currency: ctx.currency,
          raw_status: ctx.failureReason ?? 'payment_failed',
        },
      });

      return {
        transactionId: existingTransaction.id,
        created: false,
        updated: true,
      };
    }

    const paymentTransaction = await this.prisma.paymentTransaction.create({
      data: {
        user_id: ctx.userId,
        entity_id: ctx.subscriptionId,
        kind: PaymentTransactionKind.SUBSCRIPTION,
        provider: 'stripe',
        reference_number: ctx.stripeInvoiceId,
        status: PaymentTransactionStatus.FAILED,
        amount: ctx.amountDue,
        currency: ctx.currency,
        raw_status: ctx.failureReason ?? 'payment_failed',
      },
    });

    return {
      transactionId: paymentTransaction.id,
      created: true,
    };
  }
}
