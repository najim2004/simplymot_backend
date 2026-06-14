import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PromoCodeDuration, PromoCodeStatus } from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import type Stripe from 'stripe';

@Injectable()
export class CouponRepository {
  private readonly logger = new Logger(CouponRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async syncCoupon(coupon: Stripe.Coupon) {
    const promo = await this.prisma.promoCode.findFirst({
      where: { stripe_coupon_id: coupon.id },
    });
    if (!promo) {
      this.logger.warn(
        `Received coupon webhook for unknown coupon ID: ${coupon.id}`,
      );
      return null;
    }

    let nextStatus = promo.status;
    if (!coupon.valid) {
      nextStatus = PromoCodeStatus.INACTIVE;
    }

    return await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        name: coupon.name || undefined,
        percent_off: coupon.percent_off ?? undefined,
        duration: this.mapStripeDurationToPrisma(coupon.duration),
        duration_in_months: coupon.duration_in_months || null,
        status: nextStatus,
      },
    });
  }

  async deleteCoupon(coupon: Stripe.Coupon) {
    const promo = await this.prisma.promoCode.findFirst({
      where: { stripe_coupon_id: coupon.id },
    });
    if (!promo) {
      this.logger.warn(
        `Received coupon.deleted webhook for unknown coupon ID: ${coupon.id}`,
      );
      return null;
    }
    return await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        status: PromoCodeStatus.INACTIVE,
      },
    });
  }

  async syncPromotionCode(promotionCode: Stripe.PromotionCode) {
    const couponId =
      typeof promotionCode.coupon === 'string'
        ? promotionCode.coupon
        : promotionCode.coupon?.id ||
          (promotionCode as any).promotion?.coupon;

    const orConditions: Prisma.PromoCodeWhereInput[] = [
      { stripe_promotion_code_id: promotionCode.id },
      { code: promotionCode.code.toUpperCase() },
    ];
    if (couponId) {
      orConditions.push({ stripe_coupon_id: couponId });
    }

    const promo = await this.prisma.promoCode.findFirst({
      where: {
        OR: orConditions,
      },
    });

    if (!promo) {
      this.logger.warn(
        `Received promotion code webhook for unknown promotion code ID: ${promotionCode.id}`,
      );
      return null;
    }

    let nextStatus: PromoCodeStatus = promotionCode.active ? PromoCodeStatus.ACTIVE : PromoCodeStatus.INACTIVE;
    if (nextStatus === PromoCodeStatus.ACTIVE && promotionCode.expires_at && (promotionCode.expires_at * 1000) <= Date.now()) {
      nextStatus = PromoCodeStatus.EXPIRED;
    }

    return await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        code: promotionCode.code.toUpperCase(),
        stripe_promotion_code_id: promotionCode.id,
        max_redemptions: promotionCode.max_redemptions || null,
        redeemed_count: promotionCode.times_redeemed,
        expires_at: promotionCode.expires_at
          ? new Date(promotionCode.expires_at * 1000)
          : null,
        status: nextStatus,
      },
    });
  }

  private mapStripeDurationToPrisma(duration: string): PromoCodeDuration {
    if (duration === 'forever') return PromoCodeDuration.FOREVER;
    if (duration === 'repeating') return PromoCodeDuration.REPEATING;
    return PromoCodeDuration.ONCE;
  }
}
