import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { PromoCodeService } from './promo-code.service';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const PROMO_CODE = {
  id: 'clpromo001',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  code: 'FREE3MONTHS',
  name: '3 months free',
  percent_off: 100,
  duration: 'REPEATING',
  duration_days: null,
  duration_in_months: 3,
  max_redemptions: 100,
  redeemed_count: 12,
  expires_at: '2026-12-31T23:59:59.000Z',
  status: 'ACTIVE',
  stripe_coupon_id: 'coupon_xxx',
  stripe_promotion_code_id: 'promo_xxx',
  created_by_id: 'cladmin001',
  display_duration: '3 months',
  remaining_redemptions: 88,
};

@ApiTags('Admin Promo Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/promo-codes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  @ApiOperation({
    summary: 'Create promo code',
    description: 'ADMIN + JWT. Creates Stripe coupon.',
  })
  @ApiSuccessResponse({
    message: 'Promo code created successfully',
    status: HttpStatus.CREATED,
    data: PROMO_CODE,
  })
  @Post()
  create(@Body() dto: CreatePromoCodeDto, @Req() req) {
    return this.promoCodeService.create(dto, req.user?.userId || req.user?.id);
  }

  @ApiOperation({
    summary: 'List promo codes',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Promo codes fetched successfully',
    data: [PROMO_CODE],
    metaData: { total: 5, page: 1, limit: 20, totalPages: 1 },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['active', 'inactive', 'expired'],
  })
  @ApiQuery({ name: 'date_from', required: false, type: String })
  @ApiQuery({ name: 'date_to', required: false, type: String })
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: 'active' | 'inactive' | 'expired',
    @Query('date_from') dateFrom?: string,
    @Query('date_to') dateTo?: string,
  ) {
    return this.promoCodeService.findAll(page, limit, search, {
      status,
      dateFrom,
      dateTo,
    });
  }

  @ApiOperation({
    summary: 'Deactivate promo code',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'Promo code deactivated successfully',
    data: { ...PROMO_CODE, status: 'INACTIVE' },
  })
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.promoCodeService.deactivate(id);
  }
}
