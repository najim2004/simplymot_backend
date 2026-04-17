import { BadRequestException, Injectable } from '@nestjs/common';
import {
  CreateSubscriptionDto,
  CreateSubscriptionPlanDto,
} from './dto/create-subscription.dto';
import {
  UpdateSubscriptionDto,
  UpdateSubscriptionPlanDto,
} from './dto/update-subscription.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import {
  PeriodType,
  SubscriptionPlanStatus,
  SubscriptionStatus,
} from 'prisma/generated/enums';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { QuerySubscriptionPlanDto } from './dto/query-subscription.dto';
import { Prisma } from 'prisma/generated/client';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async createSubscriptionPlan(
    createSubscriptionPlanDto: CreateSubscriptionPlanDto,
  ) {
    let stripeProductId: string | null = null;
    let stripePriceId: string | null = null;

    try {
      const plan = await this.prisma.$transaction(async (tx) => {
        const existingSubscriptionPlan = await tx.subscriptionPlan.findFirst();
        if (existingSubscriptionPlan) {
          throw new BadRequestException(
            'Already has a subscription plan! Now only one subscription plan is allowed.',
          );
        }

        const createdPlan = await tx.subscriptionPlan.create({
          data: createSubscriptionPlanDto,
        });

        const stripeProduct = await StripePayment.createProduct({
          name: createSubscriptionPlanDto.name,
          active:
            createSubscriptionPlanDto.status === SubscriptionPlanStatus.ACTIVE,
        });
        stripeProductId = stripeProduct.id;

        const stripePrice = await StripePayment.createPrice({
          unit_amount: createSubscriptionPlanDto.price_pence,
          currency: createSubscriptionPlanDto.currency,
          product: stripeProduct.id,
          recurring_interval: createSubscriptionPlanDto.period_type,
        });
        stripePriceId = stripePrice.id;

        return tx.subscriptionPlan.update({
          where: { id: createdPlan.id },
          data: {
            stripe_price_id: stripePrice.id,
            stripe_product_id: stripeProduct.id,
          },
        });
      });

      return ResponseHelper.success({
        message: 'Subscription plan created successfully',
        data: plan,
      });
    } catch (error) {
      const cleanupTasks: Promise<unknown>[] = [];

      if (stripePriceId) {
        cleanupTasks.push(StripePayment.deactivatePrice(stripePriceId));
      }
      if (stripeProductId) {
        cleanupTasks.push(StripePayment.deactivateProduct(stripeProductId));
      }

      if (cleanupTasks.length) {
        await Promise.allSettled(cleanupTasks);
      }

      throw error;
    }
  }

  async getAllSubscriptionPlans(query: QuerySubscriptionPlanDto) {
    const { page, limit, search, status } = query;
    const where: Prisma.SubscriptionPlanWhereInput = {};
    if (search) {
      where['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { price_pence: { equals: Number(search) } },
        {
          period_type: {
            equals: PeriodType[search.toUpperCase() as keyof typeof PeriodType],
          },
        },
        {
          currency: {
            equals: search.toUpperCase(),
          },
        },
      ];
    }
    if (status && Object.values(SubscriptionPlanStatus).includes(status)) {
      where['status'] = status;
    }

    const [subscriptionPlans, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        select: {
          id: true,
          name: true,
          description: true,
          price_pence: true,
          period_type: true,
          trial_period_days: true,
          currency: true,
          status: true,
          created_at: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);
    return ResponseHelper.success({
      message: 'Subscription plans fetched successfully',
      data: subscriptionPlans,
      meta_data: {
        total: total,
        page: page,
        limit: limit,
        search,
        filters: {
          status,
        },
      },
    });
  }

  async getOneSubscriptionPlan(id: string) {
    const [subscriptionPlan, groupedStatusCounts] = await Promise.all([
      this.prisma.subscriptionPlan.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          price_pence: true,
          period_type: true,
          trial_period_days: true,
          currency: true,
          status: true,
          stripe_price_id: true,
          stripe_product_id: true,
          created_at: true,
          _count: {
            select: {
              subscriptions: true,
            },
          },
        },
      }),
      this.prisma.subscription.groupBy({
        by: ['status'],
        where: { plan_id: id },
        _count: { _all: true },
      }),
    ]);

    const subscriptionsByStatus = Object.values(SubscriptionStatus).reduce(
      (acc, status) => {
        acc[status] = 0;
        return acc;
      },
      {} as Record<SubscriptionStatus, number>,
    );

    for (const item of groupedStatusCounts) {
      subscriptionsByStatus[item.status] = item._count._all;
    }
    const totalSubscriptions = subscriptionPlan?._count?.subscriptions || 0;
    delete subscriptionPlan?._count;

    return ResponseHelper.success({
      message: 'Subscription plan fetched successfully',
      data: subscriptionPlan
        ? {
            ...subscriptionPlan,
            subscriptions_by_status: subscriptionsByStatus,
            total_subscriptions: totalSubscriptions,
          }
        : null,
    });
  }

  async updateSubscriptionPlan(
    id: string,
    updateSubscriptionDto: UpdateSubscriptionPlanDto,
  ) {
    const existingSubscriptionPlan =
      await this.prisma.subscriptionPlan.findUnique({
        where: { id },
      });
    if (!existingSubscriptionPlan) {
      throw new BadRequestException('Subscription plan not found');
    }

    const stripeProductId = existingSubscriptionPlan.stripe_product_id;
    const hasStripeChanges =
      updateSubscriptionDto.name !== undefined ||
      updateSubscriptionDto.description !== undefined ||
      updateSubscriptionDto.status !== undefined;

    if (stripeProductId && hasStripeChanges) {
      await StripePayment.updateProduct({
        product_id: stripeProductId,
        name:
          updateSubscriptionDto.name ??
          existingSubscriptionPlan.name ??
          undefined,
        description:
          updateSubscriptionDto.description ??
          existingSubscriptionPlan.description ??
          undefined,
        active:
          (updateSubscriptionDto.status ?? existingSubscriptionPlan.status) ===
          SubscriptionPlanStatus.ACTIVE,
      });
    }

    try {
      const updatedPlan = await this.prisma.subscriptionPlan.update({
        where: { id },
        data: updateSubscriptionDto,
      });

      return ResponseHelper.success({
        message: 'Subscription plan updated successfully',
        data: updatedPlan,
      });
    } catch (error) {
      if (stripeProductId && hasStripeChanges) {
        await Promise.allSettled([
          StripePayment.updateProduct({
            product_id: stripeProductId,
            name: existingSubscriptionPlan.name ?? undefined,
            description: existingSubscriptionPlan.description ?? undefined,
            active:
              existingSubscriptionPlan.status === SubscriptionPlanStatus.ACTIVE,
          }),
        ]);
      }

      throw error;
    }
  }

  async deleteSubscriptionPlan(id: string) {
    //  TODO: I will add the logic to delete the subscription plan here
  }

  async syncStripeSubscriptionPlans(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
    });
    if (!plan) {
      throw new BadRequestException('Subscription plan not found');
    }

    const isPlanActive = plan.status === SubscriptionPlanStatus.ACTIVE;
    let stripeProductId = plan.stripe_product_id;
    let stripePriceId = plan.stripe_price_id;
    let createdProductId: string | null = null;
    let createdPriceId: string | null = null;

    try {
      const stripeProduct = stripeProductId
        ? await StripePayment.retrieveProduct(stripeProductId).catch(() => null)
        : null;
      if (!stripeProduct) stripeProductId = null;

      if (!stripeProductId) {
        const product = await StripePayment.createProduct({
          name: plan.name,
          active: isPlanActive,
        });
        stripeProductId = product.id;
        createdProductId = product.id;
      } else {
        await StripePayment.updateProduct({
          product_id: stripeProductId,
          name: plan.name,
          description: plan.description ?? undefined,
          active: isPlanActive,
        });
      }

      const stripePrice = stripePriceId
        ? await StripePayment.retrievePrice(stripePriceId).catch(() => null)
        : null;
      let needsNewPrice = !stripePrice;

      if (stripePrice) {
        const expectedCurrency = plan.currency.toLowerCase();
        const expectedInterval = plan.period_type.toLowerCase();
        const hasMismatch =
          stripePrice.unit_amount !== plan.price_pence ||
          stripePrice.currency !== expectedCurrency ||
          stripePrice.product !== stripeProductId ||
          stripePrice.recurring?.interval !== expectedInterval;

        if (hasMismatch) {
          needsNewPrice = true;
          await StripePayment.setPriceActive({
            price_id: stripePrice.id,
            active: false,
          });
        } else if (stripePrice.active !== isPlanActive) {
          await StripePayment.setPriceActive({
            price_id: stripePrice.id,
            active: isPlanActive,
          });
        }
      }

      if (needsNewPrice) {
        const newPrice = await StripePayment.createPrice({
          unit_amount: plan.price_pence,
          currency: plan.currency,
          product: stripeProductId,
          recurring_interval: plan.period_type,
        });
        stripePriceId = newPrice.id;
        createdPriceId = newPrice.id;

        if (!isPlanActive) {
          await StripePayment.setPriceActive({
            price_id: stripePriceId,
            active: false,
          });
        }
      }

      const syncedPlan = await this.prisma.subscriptionPlan.update({
        where: { id: plan.id },
        data: {
          stripe_product_id: stripeProductId,
          stripe_price_id: stripePriceId,
        },
      });

      return ResponseHelper.success({
        message: 'Subscription plan synced with Stripe successfully',
        data: syncedPlan,
      });
    } catch (error) {
      const cleanupTasks: Promise<unknown>[] = [];

      if (createdPriceId) {
        cleanupTasks.push(
          StripePayment.setPriceActive({
            price_id: createdPriceId,
            active: false,
          }),
        );
      }
      if (createdProductId) {
        cleanupTasks.push(StripePayment.deactivateProduct(createdProductId));
      }

      if (cleanupTasks.length) {
        await Promise.allSettled(cleanupTasks);
      }

      throw error;
    }
  }
}
