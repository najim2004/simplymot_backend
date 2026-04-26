import { Module } from '@nestjs/common';
import { ContactModule } from './contact/contact.module';
import { TransactionModule } from './transaction/transaction.module';
import { UserModule } from './user/user.module';
import { NotificationModule } from './notification/notification.module';
import { VehicleModule } from './vehicle/vehicle.module';
import { BookingModule } from './booking/booking.module';
import { GarageModule } from './garage/garage.module';
import { SubscriptionModule } from './subscription/subscription.module';
import { RoleModule } from './role/role.module';
import { PromoCodeModule } from './promo-code/promo-code.module';

@Module({
  imports: [
    RoleModule,
    ContactModule,
    TransactionModule,
    UserModule,
    NotificationModule,
    VehicleModule,
    BookingModule,
    GarageModule,
    SubscriptionModule,
    PromoCodeModule,
  ],
})
export class AdminModule {}
