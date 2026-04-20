import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { GarageModule } from './garage/garage.module';
import { BookingModule } from './booking/booking.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { InvoiceModule } from './invoice/invoice.module';

@Module({
  imports: [
    NotificationModule,
    ContactModule,
    FaqModule,
    SubscriptionModule,
    GarageModule,
    BookingModule,
    VehicleModule,
    InvoiceModule,
  ],
})
export class ApplicationModule {}
