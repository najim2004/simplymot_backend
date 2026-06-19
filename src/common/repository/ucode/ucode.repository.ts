import { Injectable } from '@nestjs/common';
import { randomInt, randomBytes } from 'crypto';
import { v4 as uuid } from 'uuid';
import { DateHelper } from '../../helper/date.helper';
import { UserRepository } from '../user/user.repository';
import { PrismaService } from '../../../prisma/prisma.service';
import { UcodeStatus } from 'prisma/generated/enums';

@Injectable()
export class UcodeRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly userRepository: UserRepository,
  ) {}

  /**
   * create ucode token
   * @returns
   */
  async createToken({
    userId,
    expired_at = null,
    isOtp = false,
    email = null,
    otpDigits = 5,
  }: {
    userId: string;
    expired_at?: Date | null;
    isOtp?: boolean;
    email?: string | null;
    otpDigits?: number;
  }): Promise<string | null> {
    // OTP valid for 5 minutes
    const otpExpiryTime = 5 * 60 * 1000;
    expired_at = new Date(Date.now() + otpExpiryTime);

    const userDetails = await this.userRepository.getUserDetails(userId);
    if (userDetails && userDetails.email) {
      if (isOtp) {
        await this.deleteAllOtpsByUser(userId);
      }

      let token: string;
      if (isOtp) {
        const max = 10 ** otpDigits;
        token = String(randomInt(0, max)).padStart(otpDigits, '0');
      } else {
        token = uuid();
      }
      const data = await this.prisma.ucode.create({
        data: {
          user_id: userId,
          token: token,
          email: email ?? userDetails.email,
          expired_at: expired_at,
        },
      });
      return data.token;
    } else {
      return null;
    }
  }

  /**
   * validate ucode token
   * @returns
   */
  async validateToken({
    email,
    token,
    forEmailChange = false,
    consume = false,
  }: {
    email: string;
    token: string;
    forEmailChange?: boolean;
    consume?: boolean;
  }) {
    const userDetails = await this.userRepository.exist({
      field: 'email',
      value: email,
    });

    let proceedNext = false;
    if (forEmailChange == true) {
      proceedNext = true;
    } else {
      if (userDetails && userDetails.email) {
        proceedNext = true;
      }
    }

    if (proceedNext) {
      const date = DateHelper.now().toISOString();
      const existToken = await this.prisma.ucode.findFirst({
        where: {
          AND: {
            token: token,
            email: email,
          },
        },
      });

      if (existToken) {
        if (existToken.expired_at) {
          const data = await this.prisma.ucode.findFirst({
            where: {
              AND: [
                {
                  token: token,
                },
                {
                  email: email,
                },
                {
                  expired_at: {
                    gte: date,
                  },
                },
              ],
            },
          });
          if (data) {
            if (consume) {
              await this.deleteAllOtpsByUser(data.user_id, email);
            }
            return true;
          } else {
            return false;
          }
        } else {
          // delete this token
          await this.prisma.ucode.delete({
            where: {
              id: existToken.id,
            },
          });
          return true;
        }
      }
    } else {
      return false;
    }
  }

  /**
   * delete ucode token
   * @returns
   */
  async deleteToken({ email, token }: { email: string; token: string }) {
    await this.prisma.ucode.deleteMany({
      where: {
        AND: [{ email: email }, { token: token }],
      },
    });
  }

  async deleteAllOtpsByUser(
    userId: string | null | undefined,
    email?: string,
  ): Promise<void> {
    if (userId) {
      await this.prisma.ucode.deleteMany({
        where: { user_id: userId },
      });
      return;
    }

    if (email) {
      await this.prisma.ucode.deleteMany({
        where: { email },
      });
    }
  }

  async createVerificationToken(params: { userId: string; email: string }) {
    try {
      const token = randomBytes(32).toString('hex');

      const ucode = await this.prisma.ucode.create({
        data: {
          user_id: params.userId,
          email: params.email,
          token: token,
          expired_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          status: UcodeStatus.ACTIVE,
        },
      });

      return ucode;
    } catch (error) {
      return null;
    }
  }
}
