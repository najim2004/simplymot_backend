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
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { PromoCodeService } from './promo-code.service';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  CreatePromoCodeResponseDto,
  DeactivatePromoCodeResponseDto,
  ListPromoCodesResponseDto,
} from './dto/swagger/promo-code-api.dto';

@ApiTags('Admin Promo Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/promo_codes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  @apiTypedDoc(
    {
      summary: 'Create promo code',
      description: 'ADMIN + JWT. Creates Stripe coupon.',
    },
    { type: CreatePromoCodeResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  create(@Body() dto: CreatePromoCodeDto, @Req() req) {
    return this.promoCodeService.create(dto, req.user?.userId || req.user?.id);
  }

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
  @apiTypedDoc(
    {
      summary: 'List promo codes',
      description: 'ADMIN + JWT.',
    },
    { type: ListPromoCodesResponseDto },
  )
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

  @apiTypedDoc(
    {
      summary: 'Deactivate promo code',
      description: 'ADMIN + JWT.',
    },
    { type: DeactivatePromoCodeResponseDto },
  )
  @Patch(':promo_code_id/deactivate')
  deactivate(@Param('promo_code_id') promo_code_id: string) {
    return this.promoCodeService.deactivate(promo_code_id);
  }
}
