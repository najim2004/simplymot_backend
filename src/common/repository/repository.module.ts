import { Global, Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { UserRepository } from './user/user.repository';
import { ChatRepository } from './chat/chat.repository';
import { NotificationRepository } from './notification/notification.repository';
import { TransactionRepository } from './transaction/transaction.repository';
import { UcodeRepository } from './ucode/ucode.repository';
import { VehicleRepository } from './vehicle/vehicle.repository';

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
  ],
  exports: [
    UserRepository,
    ChatRepository,
    NotificationRepository,
    TransactionRepository,
    UcodeRepository,
    VehicleRepository,
  ],
})
export class RepositoryModule {}
