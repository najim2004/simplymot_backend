import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { VehicleRepository } from 'src/common/repository/vehicle/vehicle.repository';

@Module({
  imports: [AuthModule],
  controllers: [BookingController],
  providers: [BookingService, VehicleRepository],
})
export class BookingModule {}
