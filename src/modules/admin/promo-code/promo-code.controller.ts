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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { CreatePromoCodeDto } from './dto/create-promo-code.dto';
import { PromoCodeService } from './promo-code.service';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Admin Promo Codes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/promo-codes')
export class PromoCodeController {
  constructor(private readonly promoCodeService: PromoCodeService) {}

  @ApiOperation({ summary: 'Create promo code' })
  @ApiSuccessResponse({
    summary: 'Create promo code',
    message: 'Promo code created successfully',
    status: HttpStatus.CREATED,
    data: { id: 'promo_code_id', code: 'FREE3MONTHS', status: 'ACTIVE' },
    includeAuthErrors: true,
  })
  @Post()
  create(@Body() dto: CreatePromoCodeDto, @Req() req) {
    return this.promoCodeService.create(dto, req.user?.userId || req.user?.id);
  }

  @ApiOperation({ summary: 'List promo codes' })
  @ApiSuccessResponse({
    summary: 'List promo codes',
    message: 'Promo codes fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 20, totalPages: 1 },
    includeAuthErrors: true,
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

  @ApiOperation({ summary: 'Deactivate promo code' })
  @ApiSuccessResponse({
    summary: 'Deactivate promo code',
    message: 'Promo code deactivated successfully',
    data: { id: 'promo_code_id', status: 'INACTIVE' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':id/deactivate')
  deactivate(@Param('id') id: string) {
    return this.promoCodeService.deactivate(id);
  }
}
