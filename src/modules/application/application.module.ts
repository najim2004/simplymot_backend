import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { GarageModule } from './garage/garage.module';
import { BookingModule } from './booking/booking.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { InvoiceModule } from './invoice/invoice.module';

@Module({
  imports: [
    ContactModule,
    SubscriptionModule,
    GarageModule,
    BookingModule,
    VehicleModule,
    InvoiceModule,
  ],
})
export class ApplicationModule {}
