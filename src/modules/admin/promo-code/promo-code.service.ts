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
import { PromoCodeDuration, PromoCodeStatus } from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import {
  CreatePromoCodeDto,
  PromoCodeTypeDto,
} from './dto/create-promo-code.dto';
import { PromoCodeRepository } from 'src/common/repository/promo-code/promo-code.repository';

type PromoCodeFilterStatus = 'active' | 'inactive' | 'expired';

@Injectable()
export class PromoCodeService {
  private readonly logger = new Logger(PromoCodeService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly promoCodeRepository: PromoCodeRepository,
  ) {}

  async create(dto: CreatePromoCodeDto, adminId?: string) {
    const code = this.normalizeCode(dto.code || this.generateCode(dto.prefix));
    const percentOff = dto.percent_off || 100;

    const existingPromo = await this.prisma.promoCode.findUnique({
      where: { code },
    });

    if (existingPromo) {
      throw new ConflictException('Promo code already exists');
    }

    if (dto.type === PromoCodeTypeDto.REPEATING && !dto.duration_in_months) {
      throw new BadRequestException(
        'duration_in_months is required for repeating promo codes',
      );
    }

    const durationMonths =
      dto.type === PromoCodeTypeDto.REPEATING
        ? dto.duration_in_months
        : undefined;

    const expiresAt = dto.expires_at ? new Date(dto.expires_at) : undefined;

    if (expiresAt && expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Expiry date must be in the future');
    }

    const coupon = await StripePayment.createCoupon({
      name: dto.name || code,
      percent_off: percentOff,
      duration: this.toStripeDuration(dto.type),
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
          code: promotionCode.code.toUpperCase(),
          name: coupon.name || null,
          percent_off: coupon.percent_off || 100,
          duration: this.mapStripeDurationToPrisma(coupon.duration),
          duration_days: null,
          duration_in_months: coupon.duration_in_months || null,
          max_redemptions: promotionCode.max_redemptions || null,
          expires_at: promotionCode.expires_at
            ? new Date(promotionCode.expires_at * 1000)
            : null,
          stripe_coupon_id: coupon.id,
          stripe_promotion_code_id: promotionCode.id,
          created_by_id: adminId,
          status: promotionCode.active
            ? PromoCodeStatus.ACTIVE
            : PromoCodeStatus.INACTIVE,
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
      status?: PromoCodeFilterStatus;
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
      where.status = PromoCodeStatus.ACTIVE;
      andFilters.push({
        OR: [{ expires_at: null }, { expires_at: { gt: now } }],
      });
    }

    if (filters?.status === 'inactive') {
      where.status = PromoCodeStatus.INACTIVE;
    }

    if (filters?.status === 'expired') {
      andFilters.push({
        OR: [
          { status: PromoCodeStatus.EXPIRED },
          {
            status: PromoCodeStatus.ACTIVE,
            expires_at: { lte: now },
          },
        ],
      });
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

    if (promo.status === PromoCodeStatus.ACTIVE) {
      await StripePayment.deactivatePromotionCode(
        promo.stripe_promotion_code_id,
      );
    }

    const updatedPromo = await this.prisma.promoCode.update({
      where: { id },
      data: { status: PromoCodeStatus.INACTIVE },
    });

    return ResponseHelper.success({
      message: 'Promo code deactivated successfully',
      data: this.formatPromo(updatedPromo),
    });
  }

  async validateForRedemption(code?: string) {
    return this.promoCodeRepository.validateForRedemption(code);
  }

  async markRedeemedByStripePromotionCode(promotionCodeId?: string | null) {
    return this.promoCodeRepository.markRedeemedByStripePromotionCode(promotionCodeId);
  }

  private formatPromo(promo: Prisma.PromoCodeGetPayload<object>) {
    const isExpired =
      promo.expires_at && new Date(promo.expires_at).getTime() <= Date.now();
    let status = promo.status;
    if (status === PromoCodeStatus.ACTIVE && isExpired) {
      status = PromoCodeStatus.EXPIRED;
    }
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

  private toStripeDuration(duration: PromoCodeTypeDto) {
    if (duration === PromoCodeTypeDto.FOREVER) return 'forever';
    if (duration === PromoCodeTypeDto.REPEATING) return 'repeating';
    return 'once';
  }

  private mapStripeDurationToPrisma(duration: string): PromoCodeDuration {
    if (duration === 'forever') return PromoCodeDuration.FOREVER;
    if (duration === 'repeating') return PromoCodeDuration.REPEATING;
    return PromoCodeDuration.ONCE;
  }
}
