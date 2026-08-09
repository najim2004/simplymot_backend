import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';
import { Prisma, UserAccountStatus, UserKind } from '@generated/prisma';
import { ResponseHelper } from '../../../common/helper/response.helper';
import { QueryUserDto } from './dto/query-user.dto';
import { DayOfWeek } from '@generated/prisma/enums';
import { SubscriptionRepository } from '../../../common/repository/subscription/subscription.repository';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private prisma: PrismaService,
    private userRepository: UserRepository,
    private subscriptionRepository: SubscriptionRepository,
  ) {}

  private getCurrentDayOfWeek(): DayOfWeek {
    const days: DayOfWeek[] = [
      DayOfWeek.SUNDAY,
      DayOfWeek.MONDAY,
      DayOfWeek.TUESDAY,
      DayOfWeek.WEDNESDAY,
      DayOfWeek.THURSDAY,
      DayOfWeek.FRIDAY,
      DayOfWeek.SATURDAY,
    ];
    return days[new Date().getDay()];
  }

  private isGarageOpenNow(interval?: {
    is_closed: boolean;
    open_time: Date | null;
    close_time: Date | null;
  }) {
    if (
      !interval ||
      interval.is_closed ||
      !interval.open_time ||
      !interval.close_time
    ) {
      return false;
    }

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes =
      interval.open_time.getUTCHours() * 60 +
      interval.open_time.getUTCMinutes();
    const closeMinutes =
      interval.close_time.getUTCHours() * 60 +
      interval.close_time.getUTCMinutes();

    return nowMinutes >= openMinutes && nowMinutes <= closeMinutes;
  }

  async createUser(createUserDto: CreateUserDto, currentUserId?: string) {
    const requestedRoleIds = createUserDto.role_ids ?? [];
    let validRoles: Array<{
      id: string;
      name: string | null;
      title: string | null;
    }> = [];

    if (requestedRoleIds.length) {
      validRoles = await this.prisma.role.findMany({
        where: { id: { in: requestedRoleIds }, deleted_at: null },
        select: { id: true, name: true, title: true },
      });

      if (validRoles.length !== requestedRoleIds.length) {
        throw new BadRequestException('One or more role IDs are invalid');
      }

      if (validRoles.some((role) => role.name === 'super_admin')) {
        this.logger.warn(
          'Security violation prevented: super_admin assignment attempt during user creation',
        );
        throw new BadRequestException(
          'Super Admin role cannot be assigned via user creation.',
        );
      }

      const hasCriticalRole = validRoles.some(
        (role) => role.name === 'system_admin',
      );
      if (hasCriticalRole) {
        if (!currentUserId) {
          throw new BadRequestException(
            'Cannot verify permissions for critical role assignment.',
          );
        }

        const [currentUser, currentUserRoles] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: currentUserId },
            select: { email: true },
          }),
          this.prisma.roleUser.findMany({
            where: { user_id: currentUserId },
            select: { role: { select: { name: true } } },
          }),
        ]);

        const isSuperAdmin = currentUserRoles.some(
          (roleUser) => roleUser.role.name === 'super_admin',
        );
        if (!isSuperAdmin) {
          this.logger.warn(
            'Security violation prevented: non-super-admin attempted critical role assignment',
          );
          throw new BadRequestException(
            'Insufficient permissions. Only Super Admin can assign critical roles.',
          );
        }

        if (currentUser?.email && currentUser.email === createUserDto.email) {
          this.logger.warn(
            'Security violation prevented: self-assignment of critical role attempted',
          );
          throw new BadRequestException(
            'Cannot assign critical roles to yourself.',
          );
        }
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await this.userRepository.createUser({
        name: createUserDto.name,
        email: createUserDto.email,
        password: createUserDto.password,
        phone_number: createUserDto.phone_number,
        kind: createUserDto.kind,
      });

      await tx.user.update({
        where: { id: user.id },
        data: {
          email_verified_at: new Date(),
          approved_at: new Date(),
        },
      });

      if (validRoles.length) {
        await tx.roleUser.createMany({
          data: validRoles.map((role) => ({
            role_id: role.id,
            user_id: user.id,
          })),
          skipDuplicates: true,
        });
      }

      if (createUserDto.kind === UserKind.GARAGE) {
        try {
          const stripeCustomer = await StripePayment.createCustomer({
            user_id: user.id,
            email: createUserDto.email,
            name: createUserDto.name,
          });

          if (stripeCustomer?.id) {
            await tx.user.update({
              where: { id: user.id },
              data: { billing_id: stripeCustomer.id },
            });
          }
        } catch (stripeError) {
          this.logger.warn(
            `Stripe customer creation failed for user ${user.id}: ${stripeError.message}`,
          );
        }
      }

      return tx.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          name: true,
          email: true,
          kind: true,
          phone_number: true,
          email_verified_at: true,
          approved_at: true,
          billing_id: true,
          created_at: true,
          role_users: {
            select: {
              role: {
                select: {
                  id: true,
                  title: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    if (!result) {
      throw new BadRequestException('User creation failed');
    }

    return ResponseHelper.success({
      message: 'User created successfully',
      data: {
        id: result.id,
        email: result.email,
        name: result.name,
        kind: result.kind,
        phone_number: result.phone_number,
        email_verified_at: result.email_verified_at,
        approved_at: result.approved_at,
        billing_id: result.billing_id,
        created_at: result.created_at,
        roles: result.role_users.map((roleUser) => roleUser.role),
      },
    });
  }

  async findAllUsers({
    search,
    kind,
    status,
    page = 1,
    limit = 10,
  }: QueryUserDto) {
    const where_condition: Prisma.UserWhereInput = {};
    if (search) {
      where_condition['OR'] = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone_number: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (kind) {
      where_condition['kind'] = kind;
    }

    if (status) {
      where_condition['status'] = status;
    }

    const users = await this.prisma.user.findMany({
      where: {
        ...where_condition,
      },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        phone_number: true,
        kind: true,
        email_verified_at: true,
        approved_at: true,
        created_at: true,
        status: true,
      },
      orderBy: { created_at: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await this.prisma.user.count({ where: where_condition });

    return ResponseHelper.success({
      message: 'Users fetched successfully',
      data: users.map((user) => {
        const avatar_url = user.avatar ? SojebStorage.url(user.avatar) : null;
        return {
          ...user,
          avatar_url,
        };
      }),
      meta_data: {
        total: total,
        page: page,
        limit: limit,
        search,
        filters: {
          kind,
          status,
        },
      },
    });
  }

  async findOneUser(id: string) {
    const today = this.getCurrentDayOfWeek();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const user = await this.prisma.user.findUnique({
      where: {
        id: id,
      },
      select: {
        id: true,
        name: true,
        email: true,
        kind: true,
        phone_number: true,
        approved_at: true,
        created_at: true,
        status: true,
        email_verified_at: true,
        billing_id: true,
        avatar: true,
        garages: {
          select: {
            id: true,
            garage_name: true,
            garage_image: true,
            address: true,
            phone_number: true,
            contact_email: true,
            vts_number: true,
            created_at: true,
            schedule: {
              select: {
                id: true,
                schedule_intervals: {
                  where: {
                    day_of_week: today,
                  },
                  select: {
                    is_closed: true,
                    open_time: true,
                    close_time: true,
                  },
                  take: 1,
                },
                holidays: {
                  where: {
                    date: {
                      gte: startOfToday,
                      lte: endOfToday,
                    },
                  },
                  select: {
                    id: true,
                  },
                  take: 1,
                },
              },
            },
          },
        },
        role_users: {
          select: {
            role: {
              select: {
                id: true,
                title: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const avatar_url = user.avatar ? SojebStorage.url(user.avatar) : null;

    const data =
      user.kind === UserKind.GARAGE
        ? {
            ...user,
            avatar_url,
            garages: user.garages.map((garage) => {
              const todayInterval = garage.schedule?.schedule_intervals?.[0];
              const hasHolidayToday = Boolean(
                garage.schedule?.holidays?.length,
              );
              const is_open = hasHolidayToday
                ? false
                : this.isGarageOpenNow(todayInterval);
              return {
                ...garage,
                garage_image_url: garage.garage_image
                  ? SojebStorage.url(garage.garage_image)
                  : null,
                is_open,
                is_closed: !is_open,
              };
            }),
          }
        : {
            ...user,
            avatar_url,
          };

    return ResponseHelper.success({
      message: 'User fetched successfully',
      data,
    });
  }
  async approveUser(id: string) {
    await this.prisma.user.update({
      where: { id: id },
      data: { approved_at: DateHelper.now() },
    });
    return ResponseHelper.success({
      message: 'User approved successfully',
      data: null,
    });
  }

  async rejectUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: id },
      data: { approved_at: null },
    });
    return ResponseHelper.success({
      message: 'User rejected successfully',
      data: null,
    });
  }

  async updateUser(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
      select: { email: true, kind: true },
    });

    const systemAdminEmail = appConfig().defaultUser.system.email;
    if (existingUser && existingUser.email === systemAdminEmail) {
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        throw new BadRequestException(
          'Cannot change system administrator email',
        );
      }

      if (updateUserDto.kind && updateUserDto.kind !== UserKind.ADMIN) {
        throw new BadRequestException(
          'Cannot change system administrator user kind',
        );
      }
    }

    const user = await this.userRepository.updateUser(id, updateUserDto);
    if (!user.success) {
      if (user.message === 'User not found') {
        throw new NotFoundException(user.message);
      }
      throw new BadRequestException(user.message);
    }
    return ResponseHelper.success({
      message: user.message,
      data: null,
    });
  }

  async deleteUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        kind: true,
        billing_id: true,
        role_users: {
          select: {
            role: { select: { name: true } },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.email === appConfig().defaultUser.system.email) {
      throw new BadRequestException('Cannot delete system administrator');
    }

    const isSuperAdmin = user.role_users.some(
      (roleUser) => roleUser.role.name === 'super_admin',
    );
    if (isSuperAdmin) {
      throw new BadRequestException('Cannot delete Super Admin user');
    }

    const [vehicleCount, serviceCount, subscriptionCount] = await Promise.all([
      this.prisma.vehicle.count({ where: { user_id: id } }),
      this.prisma.service.count({ where: { garage_id: id } }),
      this.prisma.subscription.count({ where: { user_id: id } }),
    ]);

    await this.prisma.user.delete({ where: { id } });

    this.logger.log(
      `Deleted user ${user.email} (${user.kind}). Vehicles: ${vehicleCount}, Services: ${serviceCount}, Subscriptions: ${subscriptionCount}`,
    );

    if (
      user.billing_id &&
      (user.kind === UserKind.DRIVER || user.kind === UserKind.GARAGE)
    ) {
      this.logger.log(
        `Deleted user ${user.email} had Stripe customer ${user.billing_id}. Customer remains in Stripe.`,
      );
    }

    return ResponseHelper.success({
      message: 'User deleted permanently',
      data: {
        user_id: user.id,
        email: user.email,
        name: user.name,
        kind: user.kind,
        deleted_at: new Date(),
        deleted_records: {
          vehicles: vehicleCount,
          services: serviceCount,
          subscriptions: subscriptionCount,
        },
        stripe_customer_id: user.billing_id || null,
      },
    });
  }

  async banUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const cancelledSubscriptions =
      await this.subscriptionRepository.cancelActiveSubscriptionsForUser(
        id,
        'Cancelled due to account ban',
      );

    await this.prisma.user.update({
      where: { id: id },
      data: { status: UserAccountStatus.BANNED, banned_at: DateHelper.now() },
    });
    return ResponseHelper.success({
      message: 'User banned successfully',
      data: {
        cancelled_subscriptions: cancelledSubscriptions,
      },
    });
  }

  async unbanUser(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id },
      data: {
        status: UserAccountStatus.ACTIVE,
        banned_at: null,
      },
    });

    return ResponseHelper.success({
      message: 'User unbanned successfully',
      data: null,
    });
  }
}
