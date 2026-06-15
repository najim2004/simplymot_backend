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
import { PostCodeMapRepository } from './post-code-map/post-code-map.repository';
import { PromoCodeRepository } from './promo-code/promo-code.repository';
import { InvoiceRepository } from './invoice/invoice.repository';

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
    PostCodeMapRepository,
    PromoCodeRepository,
    InvoiceRepository,
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
    PostCodeMapRepository,
    PromoCodeRepository,
    InvoiceRepository,
  ],
})
export class RepositoryModule {}
