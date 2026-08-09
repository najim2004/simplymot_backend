import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import appConfig from '../../../config/app.config';
import { ArrayHelper } from '../../helper/array.helper';
import { Role } from '../../guard/role/role.enum';
import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserKind } from '@generated/prisma';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}
  /**
   * get user by email
   * @param email
   * @returns
   */
  async getUserByEmail(email: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  // email varification
  async verifyEmail({ email }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    return user;
  }

  /**
   * get user details
   * @returns
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
      },
      include: {
        role_users: {
          where: {
            role: { deleted_at: null },
          },
          include: {
            role: {
              include: {
                permission_roles: {
                  where: {
                    permission: { deleted_at: null },
                  },
                  include: {
                    permission: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    return user;
  }

  /**
   * Check existance
   * @returns
   */
  async exist({ field, value }) {
    const model = await this.prisma.user.findFirst({
      where: {
        [field]: value,
      },
    });
    return model;
  }

  /**
   * Create su admin user
   * @param param0
   * @returns
   */
  async createSuAdminUser({ name, username, email, password }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);

      const user = await this.prisma.user.create({
        data: {
          name: name,
          username: username,
          email: email,
          password: password,
          kind: UserKind.ADMIN,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Invite user under tenant
   * @param param0
   * @returns
   */
  async inviteUser({
    name,
    username,
    email,
    role_id,
  }: {
    name: string;
    username: string;
    email: string;
    role_id: string;
  }) {
    try {
      const user = await this.prisma.user.create({
        data: {
          name: name,
          username: username,
          email: email,
        },
      });
      if (user) {
        // attach role
        await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
        return user;
      } else {
        return false;
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Attach a role to a user
   * @param param0
   * @returns
   */
  async attachRole({ user_id, role_id }: { user_id: string; role_id: string }) {
    const role = await this.prisma.roleUser.create({
      data: {
        user_id: user_id,
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * update user role
   * @param param0
   * @returns
   */
  async syncRole({ user_id, role_id }: { user_id: string; role_id: string }) {
    const role = await this.prisma.roleUser.updateMany({
      where: {
        AND: [
          {
            user_id: user_id,
          },
        ],
      },
      data: {
        role_id: role_id,
      },
    });
    return role;
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async createUser({
    name,
    first_name,
    last_name,
    email,
    password,
    phone_number,
    role_id = null,
    kind = UserKind.USER,
  }: {
    name?: string;
    first_name?: string;
    last_name?: string;
    email: string;
    password: string;
    phone_number?: string;
    role_id?: string;
    kind?: UserKind;
  }) {
    const data = {};
    if (name) {
      data['name'] = name;
    }
    if (first_name) {
      data['first_name'] = first_name;
    }
    if (last_name) {
      data['last_name'] = last_name;
    }
    if (phone_number) {
      data['phone_number'] = phone_number;
    }
    if (email) {
      // Check if email already exist
      const userEmailExist = await this.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        throw new ConflictException('Email already exist');
      }

      data['email'] = email;
    }
    if (password) {
      data['password'] = await bcrypt.hash(password, appConfig().security.salt);
    }

    if (kind && ArrayHelper.inArray(kind, Object.values(UserKind))) {
      data['kind'] = kind;

      // if (type == Role.VENDOR) {
      //   data['approved_at'] = DateHelper.now();
      // }
    }

    const user = await this.prisma.user.create({
      data: {
        ...data,
      },
    });

    if (user) {
      if (role_id) {
        // attach role
        await this.attachRole({
          user_id: user.id,
          role_id: role_id,
        });
      }

      return user;
    } else {
      throw new Error('User creation failed');
    }
  }

  /**
   * create user under a tenant
   * @param param0
   * @returns
   */
  async updateUser(
    user_id: string,
    {
      name,
      email,
      password,
      role_id = null,
      type = 'user',
    }: {
      name?: string;
      email?: string;
      password?: string;
      role_id?: string;
      type?: string;
    },
  ) {
    try {
      const data = {};
      if (name) {
        data['name'] = name;
      }
      if (email) {
        // Check if email already exist
        const userEmailExist = await this.exist({
          field: 'email',
          value: String(email),
        });

        if (userEmailExist) {
          return {
            success: false,
            message: 'Email already exist',
          };
        }
        data['email'] = email;
      }
      if (password) {
        data['password'] = await bcrypt.hash(
          password,
          appConfig().security.salt,
        );
      }

      if (ArrayHelper.inArray(type, Object.values(Role))) {
        data['type'] = type;
      } else {
        return {
          success: false,
          message: 'Invalid user type',
        };
      }

      const existUser = await this.prisma.user.findFirst({
        where: {
          id: user_id,
        },
      });

      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          ...data,
        },
      });

      if (user) {
        if (role_id) {
          // attach role
          await this.attachRole({
            user_id: user.id,
            role_id: role_id,
          });
        }

        return {
          success: true,
          message: 'User updated successfully',
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User update failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * delete user
   * @param param0
   * @returns
   */
  async deleteUser(user_id: string) {
    try {
      // check if user exist
      const existUser = await this.prisma.user.findFirst({
        where: {
          id: user_id,
        },
      });
      if (!existUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      await this.prisma.user.delete({
        where: {
          id: user_id,
        },
      });
      return {
        success: true,
        message: 'User deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // change password
  async changePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    try {
      password = await bcrypt.hash(password, appConfig().security.salt);
      const user = await this.prisma.user.update({
        where: {
          email: email,
        },
        data: {
          password: password,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // change email
  async changeEmail({
    user_id,
    new_email,
  }: {
    user_id: string;
    new_email: string;
  }) {
    try {
      const user = await this.prisma.user.update({
        where: {
          id: user_id,
        },
        data: {
          email: new_email,
        },
      });
      return user;
    } catch (error) {
      throw error;
    }
  }

  // validate password
  async validatePassword({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) {
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });
    if (user) {
      const isValid = await bcrypt.compare(password, user.password);
      return isValid;
    } else {
      return false;
    }
  }
}
