import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { PaymentTransactionModule } from './payment-transaction/payment-transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { BookingModule } from './booking/booking.module';
import { GarageModule } from './garage/garage.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { RoleModule } from './role/role.module';

@Module({
  imports: [
    RoleModule,
    ContactModule,
    PaymentTransactionModule,
    UserModule,
    NotificationModule,
    VehicleModule,
    BookingModule,
    GarageModule,
    SubscriptionModule,
  ],
})
export class AdminModule {}
