import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { PromoCodeStatus } from 'prisma/generated/enums';

@Injectable()
export class PromoCodeRepository {
  private readonly logger = new Logger(PromoCodeRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeCode(code: string) {
    return code.trim().replace(/\s+/g, '').toUpperCase();
  }

  async validateForRedemption(code?: string) {
    if (!code) return null;

    const normalizedCode = this.normalizeCode(code);
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!promo || promo.status !== PromoCodeStatus.ACTIVE) {
      throw new BadRequestException('Invalid or inactive promo code');
    }
    if (promo.expires_at && promo.expires_at.getTime() <= Date.now()) {
      await this.prisma.promoCode.update({
        where: { id: promo.id },
        data: { status: PromoCodeStatus.EXPIRED },
      });
      throw new BadRequestException('Promo code has expired');
    }
    if (
      promo.max_redemptions &&
      promo.redeemed_count >= promo.max_redemptions
    ) {
      throw new BadRequestException('Promo code redemption limit reached');
    }

    const stripePromo = await StripePayment.retrievePromotionCode(
      promo.stripe_promotion_code_id,
    );

    let nextStatus: PromoCodeStatus = stripePromo.active
      ? PromoCodeStatus.ACTIVE
      : PromoCodeStatus.INACTIVE;
    if (
      nextStatus === PromoCodeStatus.ACTIVE &&
      stripePromo.expires_at &&
      stripePromo.expires_at * 1000 <= Date.now()
    ) {
      nextStatus = PromoCodeStatus.EXPIRED;
    }

    await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        status: nextStatus,
        redeemed_count: stripePromo.times_redeemed || promo.redeemed_count,
      },
    });

    if (!stripePromo.active) {
      throw new BadRequestException('Promo code is inactive');
    }
    if (
      stripePromo.max_redemptions &&
      stripePromo.times_redeemed >= stripePromo.max_redemptions
    ) {
      throw new BadRequestException('Promo code redemption limit reached');
    }

    return {
      ...promo,
      redeemed_count: stripePromo.times_redeemed || promo.redeemed_count,
      stripe_promotion_code_id: stripePromo.id,
    };
  }

  async markRedeemedByStripePromotionCode(promotionCodeId?: string | null) {
    if (!promotionCodeId) return;

    try {
      const promo = await this.prisma.promoCode.findUnique({
        where: { stripe_promotion_code_id: promotionCodeId },
      });

      if (!promo) return;

      const stripePromo =
        await StripePayment.retrievePromotionCode(promotionCodeId);

      let nextStatus: PromoCodeStatus = stripePromo.active
        ? PromoCodeStatus.ACTIVE
        : PromoCodeStatus.INACTIVE;
      if (
        nextStatus === PromoCodeStatus.ACTIVE &&
        stripePromo.expires_at &&
        stripePromo.expires_at * 1000 <= Date.now()
      ) {
        nextStatus = PromoCodeStatus.EXPIRED;
      }

      await this.prisma.promoCode.update({
        where: { id: promo.id },
        data: {
          redeemed_count:
            stripePromo.times_redeemed || promo.redeemed_count + 1,
          status: nextStatus,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to sync promo code redemption for ${promotionCodeId}: ${message}`,
      );
    }
  }
}
