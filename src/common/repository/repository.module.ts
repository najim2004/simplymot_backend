import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from './user/user.repository';
import { ChatRepository } from './chat/chat.repository';
import { NotificationRepository } from './notification/notification.repository';
import { TransactionRepository } from './transaction/transaction.repository';
import { UcodeRepository } from './ucode/ucode.repository';
import { VehicleRepository } from './vehicle/vehicle.repository';
import { SubscriptionRepository } from './subscription/subscription.repository';
import { SlotRepository } from './slot/slot.repository';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    UserRepository,
    ChatRepository,
    NotificationRepository,
    TransactionRepository,
    UcodeRepository,
    VehicleRepository,
    SubscriptionRepository,
    SlotRepository,
  ],
  exports: [
    UserRepository,
    ChatRepository,
    NotificationRepository,
    TransactionRepository,
    UcodeRepository,
    VehicleRepository,
    SubscriptionRepository,
    SlotRepository,
  ],
})
export class RepositoryModule {}
