// external imports
import {
  BadRequestException,
  HttpStatus,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';

//internal imports
import appConfig from '../../config/app.config';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { MailService } from '../../mail/mail.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SojebStorage } from '../../common/lib/Disk/SojebStorage';
import { StripePayment } from '../../common/lib/Payment/stripe/StripePayment';
import { StringHelper } from '../../common/helper/string.helper';
import {
  ChangeEmailDto,
  ChangePasswordDto,
  RegisterUserDto,
  ForgotPasswordDto,
  RequestEmailChangeDto,
  ResendVerificationEmailDto,
  ResetPasswordDto,
  VerifyEmailDto,
  CheckOTPValidationDto,
} from './dto/auth.dto';
import { UserAccountStatus, UserKind } from 'prisma/generated/enums';
import { Prisma } from 'prisma/generated/client';
import { PostCodeMapRepository } from 'src/common/repository/post-code-map/post-code-map.repository';
import { SubscriptionService } from '../application/subscription/subscription.service';

@Injectable()
export class AuthService {
  private static readonly PROFILE_CACHE_TTL_SECONDS = 60 * 5;

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
    private userRepository: UserRepository,
    private ucodeRepository: UcodeRepository,
    private postCodeMapRepository: PostCodeMapRepository,
    private subscriptionService: SubscriptionService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  private getProfileCacheKey(userId: string) {
    return `cache:auth:me:${userId}`;
  }

  async me(id: string) {
    const cacheKey = this.getProfileCacheKey(id);
    const cachedUser = await this.redis.get(cacheKey);
    let user: Record<string, unknown>;

    if (cachedUser) {
      user = JSON.parse(cachedUser);
    } else {
      const dbUser = await this.prisma.user.findFirst({
        where: {
          id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          address: true,
          phone_number: true,
          kind: true,
          garages: {
            select: {
              id: true,
              garage_name: true,
              vts_number: true,
              contact_email: true,
              phone_number: true,
            },
            take: 1,
          },
          created_at: true,
          email_verified_at: true,
          status: true,
        },
      });

      if (!dbUser) {
        throw new NotFoundException('User not found');
      }

      if (dbUser.avatar) {
        dbUser['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + dbUser.avatar,
        );
      }

      let userRoles = [];

      if (dbUser.kind == UserKind.ADMIN) {
        const roleUsers = await this.prisma.roleUser.findMany({
          where: {
            user_id: id,
          },
          select: {
            role: {
              select: {
                id: true,
                title: true,
                name: true,
                permission_roles: {
                  select: {
                    permission: {
                      select: {
                        id: true,
                        title: true,
                        action: true,
                        subject: true,
                        conditions: true,
                        fields: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        userRoles = roleUsers.map((roleUser) => {
          return {
            id: roleUser.role.id,
            title: roleUser.role.title,
            name: roleUser.role.name,
            permissions: roleUser.role.permission_roles.map(
              (permissionRole) => {
                return {
                  id: permissionRole.permission.id,
                  title: permissionRole.permission.title,
                  action: permissionRole.permission.action,
                  subject: permissionRole.permission.subject,
                  conditions: permissionRole.permission.conditions,
                  fields: permissionRole.permission.fields,
                };
              },
            ),
          };
        });
      }

      user = {
        ...dbUser,
        ...(userRoles.length > 0 ? { roles: userRoles } : {}),
      };

      await this.redis.set(
        cacheKey,
        JSON.stringify(user),
        'EX',
        AuthService.PROFILE_CACHE_TTL_SECONDS,
      );
    }

    if (user.kind === UserKind.GARAGE) {
      user.subscription =
        await this.subscriptionService.getActiveSubscriptionSummary(id);
    }

    return {
      success: true,
      message: 'User details fetched successfully',
      data: user,
    };
  }

  async updateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    avatar?: Express.Multer.File,
  ) {
    const data: Prisma.UserUpdateInput = {};
    if (updateUserDto.name) data.name = updateUserDto.name;

    if (updateUserDto.phone_number)
      data.phone_number = updateUserDto.phone_number;

    if (avatar) {
      // delete old image from storage
      const oldImage = await this.prisma.user.findFirst({
        where: { id },
        select: { avatar: true },
      });
      if (oldImage.avatar) {
        try {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldImage.avatar,
          );
        } catch (error) {
          console.error('Failed to delete old avatar:', error.message);
        }
      }

      // upload file
      const fileName =
        appConfig().storageUrl.avatar +
        `/${StringHelper.randomString()}${avatar.originalname}`;
      await SojebStorage.put(fileName, avatar.buffer);

      data.avatar = fileName;
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (user) {
      await this.prisma.user.update({
        where: { id },
        data: {
          ...data,
        },
      });
      await this.redis.del(this.getProfileCacheKey(id));

      return {
        success: true,
        message: 'User updated successfully',
      };
    } else {
      throw new NotFoundException('User not found');
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        if (user.status === UserAccountStatus.BANNED) {
          throw new UnauthorizedException('Account not approved or banned');
        }
        if (user.status === UserAccountStatus.SUSPENDED) {
          throw new UnauthorizedException('Account suspended');
        }
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
      }
    } else {
      throw new UnauthorizedException('Email not found');
    }
  }

  async login({ email, id }) {
    const payload = { email: email, sub: id };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    const user = await this.userRepository.getUserDetails(id);

    return {
      success: true,
      message: 'Logged in successfully',
      authorization: {
        type: 'bearer',
        access_token: accessToken,
      },
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        kind: user.kind,
        avatar: user.avatar,
        phone_number: user.phone_number,
        address: user.address,
        city: user.city,
        state: user.state,
      },
    };
  }

  // async refreshToken(user_id: string, refreshToken: string) {
  //   const storedToken = await this.redis.get(`refresh_token:${user_id}`);

  //   if (!storedToken || storedToken != refreshToken) {
  //     return {
  //       success: false,
  //       message: 'Refresh token is required',
  //     };
  //   }

  //   if (!user_id) {
  //     return {
  //       success: false,
  //       message: 'User not found',
  //     };
  //   }

  //   const userDetails = await this.userRepository.getUserDetails(user_id);
  //   if (!userDetails) {
  //     return {
  //       success: false,
  //       message: 'User not found',
  //     };
  //   }

  //   const payload = { email: userDetails.email, sub: userDetails.id };
  //   const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

  //   return {
  //     success: true,
  //     authorization: {
  //       type: 'bearer',
  //       access_token: accessToken,
  //     },
  //   };
  // }

  // async revokeRefreshToken(user_id: string) {
  //   const storedToken = await this.redis.get(`refresh_token:${user_id}`);
  //   if (!storedToken) {
  //     return {
  //       success: false,
  //       message: 'Refresh token not found',
  //     };
  //   }

  //   await this.redis.del(`refresh_token:${user_id}`);

  //   return {
  //     success: true,
  //     message: 'Refresh token revoked successfully',
  //   };
  // }

  async register(registerUserDto: RegisterUserDto) {
    const {
      name,
      email,
      password,
      kind,
      garage_name,
      vts_number,
      primary_contact,
      phone_number,
      post_code,
      address,
      city,
      state,
      country,
    } = registerUserDto;
    // Check if email already exist
    const userEmailExist = await this.userRepository.exist({
      field: 'email',
      value: String(email),
    });

    if (userEmailExist) {
      throw new BadRequestException('Email already exist');
    }

    const user = await this.userRepository.createUser({
      name: name,
      email: email,
      password: password,
      kind: kind,
      phone_number: phone_number,
    });

    if (kind === UserKind.GARAGE) {
      const location = post_code
        ? await this.postCodeMapRepository.getLatLng(post_code)
        : null;

      await this.prisma.garage.create({
        data: {
          owner: {
            connect: {
              id: user.id,
            },
          },
          garage_name: garage_name,
          vts_number: vts_number,
          contact_email: primary_contact || email,
          phone_number: phone_number,
          address,
          city,
          state,
          country,
          post_code: post_code?.trim().toUpperCase(),
          latitude: location?.lat,
          longitude: location?.lng,
        },
      });
      try {
        // create stripe customer account
        const stripeCustomer = await StripePayment.createCustomer({
          user_id: user.id,
          email: email,
          name: name,
        });

        if (stripeCustomer) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              billing_id: stripeCustomer.id,
            },
          });
        }
      } catch (error) {
        console.error(
          'Stripe customer creation failed on garage registration api:',
          error.message,
        );
      }
    }

    // ----------------------------------------------------
    // // create otp code
    const token = await this.ucodeRepository.createToken({
      userId: user.id,
      isOtp: true,
    });

    // // send otp code to email
    try {
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: name,
        otp: token,
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }

    return {
      success: true,
      message: 'We have sent an OTP code to your email',
    };

    // ----------------------------------------------------

    // Generate verification token
    // const token = await this.ucodeRepository.createVerificationToken({
    //   userId: user.data.id,
    //   email: email,
    // });

    // Send verification email with token
    // await this.mailService.sendVerificationLink({
    //   email,
    //   name: email,
    //   token: token.token,
    //   type: type,
    // });

    // return {
    //   success: true,
    //   message: 'We have sent a verification link to your email',
    // };
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const token = await this.ucodeRepository.createToken({
        userId: user.id,
        isOtp: true,
      });

      try {
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });
      } catch (error) {
        throw new BadRequestException(error.message);
      }

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const { email, token, password } = resetPasswordDto;
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: token,
        consume: true,
      });

      if (existToken) {
        await this.userRepository.changePassword({
          email: email,
          password: password,
        });

        return {
          success: true,
          message: 'Password updated successfully',
        };
      } else {
        throw new BadRequestException('Invalid token');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async checkOTPValidation(checkOTPValidationDto: CheckOTPValidationDto) {
    const { email, otp } = checkOTPValidationDto;
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: otp,
      });

      if (existToken) {
        return {
          success: true,
          message: 'OTP is valid',
        };
      } else {
        throw new BadRequestException('Invalid OTP');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }
  async verifyEmail(verifyEmailDto: VerifyEmailDto) {
    const { email, token } = verifyEmailDto;
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: token,
        consume: true,
      });

      if (existToken) {
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            email_verified_at: new Date(Date.now()),
            status: UserAccountStatus.ACTIVE,
          },
        });

        return {
          success: true,
          message: 'Email verified successfully',
        };
      } else {
        throw new BadRequestException('Invalid token');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async resendVerificationEmail(
    resendVerificationEmailDto: ResendVerificationEmailDto,
  ) {
    const { email } = resendVerificationEmailDto;
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      // create otp code
      const token = await this.ucodeRepository.createToken({
        userId: user.id,
        isOtp: true,
      });

      // send otp code to email

      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: user.name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent a verification code to your email',
      };
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async changePassword({
    user_id,
    old_password,
    new_password,
  }: ChangePasswordDto & { user_id: string }) {
    const user = await this.userRepository.getUserDetails(user_id);

    if (user) {
      const _isValidPassword = await this.userRepository.validatePassword({
        email: user.email,
        password: old_password,
      });
      if (_isValidPassword) {
        await this.userRepository.changePassword({
          email: user.email,
          password: new_password,
        });

        return {
          success: true,
          message: 'Password updated successfully',
        };
      } else {
        throw new BadRequestException('Invalid password');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }

  async requestEmailChange(
    user_id: string,
    requestEmailChangeDto: RequestEmailChangeDto,
  ) {
    const { email } = requestEmailChangeDto;
    const user = await this.userRepository.getUserDetails(user_id);
    if (user) {
      const token = await this.ucodeRepository.createToken({
        userId: user.id,
        isOtp: true,
        email: email,
      });

      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: user.name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
    } else {
      throw new NotFoundException('User not found');
    }
  }

  async changeEmail(changeEmailDto: ChangeEmailDto) {
    const { email, token } = changeEmailDto;
    const user = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    if (user) {
      const existToken = await this.ucodeRepository.validateToken({
        email: email,
        token: token,
        forEmailChange: true,
        consume: true,
      });

      if (existToken) {
        await this.userRepository.changeEmail({
          user_id: user.id,
          new_email: email,
        });

        await this.redis.del(this.getProfileCacheKey(user.id));

        return {
          success: true,
          message: 'Email updated successfully',
        };
      } else {
        throw new BadRequestException('Invalid token');
      }
    } else {
      throw new NotFoundException('Email not found');
    }
  }
}
