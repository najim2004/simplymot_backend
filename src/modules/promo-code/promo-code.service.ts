import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseHelper } from 'src/common/helper/response.helper';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { PromoCodeDuration } from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import {
  CreatePromoCodeDto,
  PromoCodeDurationDto,
} from './dto/create-promo-code.dto';

type PromoCodeStatus = 'active' | 'inactive' | 'expired';

@Injectable()
export class PromoCodeService {
  private readonly logger = new Logger(PromoCodeService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromoCodeDto, adminId?: string) {
    const code = this.normalizeCode(dto.code || this.generateCode(dto.prefix));
    const percentOff = dto.percent_off || 100;

    const existingPromo = await this.prisma.promoCode.findUnique({
      where: { code },
    });

    if (existingPromo) {
      throw new ConflictException('Promo code already exists');
    }

    const durationDays =
      dto.duration === PromoCodeDurationDto.REPEATING
        ? dto.duration_days || 90
        : undefined;
    const durationMonths =
      dto.duration === PromoCodeDurationDto.REPEATING
        ? dto.duration_in_months ||
          Math.max(1, Math.ceil((durationDays || 90) / 30))
        : undefined;
    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : undefined;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Expiry date must be in the future');
    }

    const coupon = await StripePayment.createCoupon({
      name: dto.name || code,
      percent_off: percentOff,
      duration: this.toStripeDuration(dto.duration),
      duration_in_months: durationMonths,
    });

    const promotionCode = await StripePayment.createPromotionCode({
      coupon: coupon.id,
      code,
      max_redemptions: dto.max_redemptions,
      expires_at: expiresAt
        ? Math.floor(expiresAt.getTime() / 1000)
        : undefined,
      metadata: {
        source: 'admin_dashboard',
        created_by_id: adminId || '',
      },
    });

    let promoCode: Prisma.PromoCodeGetPayload<object>;
    try {
      promoCode = await this.prisma.promoCode.create({
        data: {
          code,
          name: dto.name,
          percent_off: percentOff,
          duration: dto.duration as PromoCodeDuration,
          duration_days: durationDays || null,
          duration_in_months:
            dto.duration === PromoCodeDurationDto.REPEATING
              ? durationMonths
              : null,
          max_redemptions: dto.max_redemptions || null,
          expires_at: expiresAt,
          stripe_coupon_id: coupon.id,
          stripe_promotion_code_id: promotionCode.id,
          created_by_id: adminId,
        },
      });
    } catch (error) {
      await Promise.allSettled([
        StripePayment.deactivatePromotionCode(promotionCode.id),
      ]);
      throw error;
    }

    return ResponseHelper.success({
      message: 'Promo code created successfully',
      data: this.formatPromo(promoCode),
    });
  }

  async findAll(
    page = 1,
    limit = 20,
    search?: string,
    filters?: {
      status?: PromoCodeStatus;
      dateFrom?: string;
      dateTo?: string;
    },
  ) {
    const safePage = Math.max(Number(page) || 1, 1);
    const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const where: Prisma.PromoCodeWhereInput = {};
    const andFilters: Prisma.PromoCodeWhereInput[] = [];
    const now = new Date();

    if (search) {
      andFilters.push({
        OR: [
          { code: { contains: search, mode: 'insensitive' } },
          { name: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (filters?.status === 'active') {
      where.is_active = true;
      andFilters.push({
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      });
    }

    if (filters?.status === 'inactive') {
      where.is_active = false;
    }

    if (filters?.status === 'expired') {
      where.is_active = true;
      where.expires_at = { lte: now };
    }

    const dateFilter: Prisma.DateTimeFilter = {};
    if (filters?.dateFrom) {
      dateFilter.gte = this.parseDate(filters.dateFrom, 'Invalid date_from');
    }
    if (filters?.dateTo) {
      dateFilter.lte = this.parseDate(filters.dateTo, 'Invalid date_to');
    }
    if (Object.keys(dateFilter).length) {
      where.created_at = dateFilter;
    }
    if (andFilters.length) {
      where.AND = andFilters;
    }

    const [promoCodes, total] = await Promise.all([
      this.prisma.promoCode.findMany({
        where,
        skip: (safePage - 1) * safeLimit,
        take: safeLimit,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.promoCode.count({ where }),
    ]);

    return ResponseHelper.success({
      message: 'Promo codes fetched successfully',
      data: promoCodes.map((promo) => this.formatPromo(promo)),
      meta_data: {
        total,
        page: safePage,
        limit: safeLimit,
        totalPages: Math.ceil(total / safeLimit),
        search,
        filters,
      },
    });
  }

  async deactivate(id: string) {
    const promo = await this.prisma.promoCode.findUnique({
      where: { id },
    });

    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }

    if (promo.is_active) {
      await StripePayment.deactivatePromotionCode(
        promo.stripe_promotion_code_id,
      );
    }

    const updatedPromo = await this.prisma.promoCode.update({
      where: { id },
      data: { is_active: false },
    });

    return ResponseHelper.success({
      message: 'Promo code deactivated successfully',
      data: this.formatPromo(updatedPromo),
    });
  }

  async validateForRedemption(code?: string) {
    if (!code) return null;

    const normalizedCode = this.normalizeCode(code);
    const promo = await this.prisma.promoCode.findUnique({
      where: { code: normalizedCode },
    });

    if (!promo || !promo.is_active) {
      throw new BadRequestException('Invalid or inactive promo code');
    }
    if (promo.expires_at && promo.expires_at.getTime() <= Date.now()) {
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

    await this.prisma.promoCode.update({
      where: { id: promo.id },
      data: {
        is_active: stripePromo.active,
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

      await this.prisma.promoCode.update({
        where: { id: promo.id },
        data: {
          redeemed_count:
            stripePromo.times_redeemed || promo.redeemed_count + 1,
          is_active: stripePromo.active,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `Failed to sync promo code redemption for ${promotionCodeId}: ${message}`,
      );
    }
  }

  private formatPromo(promo: Prisma.PromoCodeGetPayload<object>) {
    const isExpired =
      promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now();
    const status = !promo.is_active
      ? 'INACTIVE'
      : isExpired
        ? 'EXPIRED'
        : 'ACTIVE';
    const repeatingDays =
      promo.duration_days || (promo.duration_in_months || 0) * 30;

    return {
      ...promo,
      status,
      display_duration:
        promo.duration === PromoCodeDuration.FOREVER
          ? 'Lifetime'
          : promo.duration === PromoCodeDuration.REPEATING
            ? `${repeatingDays} day${repeatingDays === 1 ? '' : 's'}`
            : 'Once',
      remaining_redemptions: promo.max_redemptions
        ? Math.max(0, promo.max_redemptions - promo.redeemed_count)
        : null,
    };
  }

  private parseDate(value: string, message: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(message);
    }
    return date;
  }

  private normalizeCode(code: string) {
    return code.trim().replace(/\s+/g, '').toUpperCase();
  }

  private generateCode(prefix?: string) {
    const normalizedPrefix = prefix ? this.normalizeCode(prefix) : 'PROMO';
    return `${normalizedPrefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  }

  private toStripeDuration(duration: PromoCodeDurationDto) {
    if (duration === PromoCodeDurationDto.FOREVER) return 'forever';
    if (duration === PromoCodeDurationDto.REPEATING) return 'repeating';
    return 'once';
  }
}
