import { Module } from '@nestjs/common';
import { PromoCodeService } from 'src/modules/promo-code/promo-code.service';
import { PromoCodeController } from './promo-code.controller';

@Module({
  controllers: [PromoCodeController],
  providers: [PromoCodeService],
})
export class PromoCodeModule {}
