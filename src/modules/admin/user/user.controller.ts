import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/get-user.decorator';
import { QueryUserDto } from './dto/query-user.dto';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const USER_LIST_ITEM = {
  id: 'cluser001',
  name: 'John Driver',
  email: 'john@example.com',
  avatar: null,
  avatar_url: null,
  phone_number: '+441112223333',
  kind: 'DRIVER',
  email_verified_at: '2026-01-15T00:00:00.000Z',
  approved_at: '2026-01-16T00:00:00.000Z',
  created_at: '2026-01-10T00:00:00.000Z',
  status: 'ACTIVE',
};

const USER_LIST_META = { total: 50, page: 1, limit: 10, pages: 5 };

const USER_CREATED = {
  id: 'cluser002',
  email: 'garage@example.com',
  name: 'Garage Owner',
  kind: 'GARAGE',
  phone_number: '+441234567890',
  email_verified_at: null,
  approved_at: null,
  billing_id: null,
  created_at: '2026-06-14T10:00:00.000Z',
  roles: [],
};

@ApiBearerAuth()
@ApiTags('Admin Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Create user',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'User created successfully',
    status: HttpStatus.CREATED,
    data: USER_CREATED,
  })
  @Post()
  createUser(
    @Body() createUserDto: CreateUserDto,
    @User('id') currentUserId: string,
  ) {
    return this.userService.createUser(createUserDto, currentUserId);
  }

  @ApiOperation({
    summary: 'List users',
    description: 'ADMIN + JWT. Paginated with filters.',
  })
  @ApiSuccessResponse({
    message: 'Users fetched successfully',
    data: [USER_LIST_ITEM],
    metaData: USER_LIST_META,
  })
  @Get()
  findAllUsers(@Query() queryUserDto: QueryUserDto) {
    return this.userService.findAllUsers(queryUserDto);
  }

  @ApiOperation({
    summary: 'Approve user',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'User approved successfully',
    data: null,
  })
  @Post(':user_id/approve')
  approveUser(@Param('user_id') user_id: string) {
    return this.userService.approveUser(user_id);
  }

  @ApiOperation({
    summary: 'Reject user',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'User rejected successfully',
    data: null,
  })
  @Post(':user_id/reject')
  rejectUser(@Param('user_id') user_id: string) {
    return this.userService.rejectUser(user_id);
  }

  @ApiOperation({
    summary: 'Ban user',
    description: 'ADMIN + JWT. Cancels garage subscriptions.',
  })
  @ApiSuccessResponse({
    message: 'User banned successfully',
    data: { cancelled_subscriptions: 1 },
  })
  @Post(':user_id/ban')
  banUser(@Param('user_id') user_id: string) {
    return this.userService.banUser(user_id);
  }

  @ApiOperation({
    summary: 'Unban user',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'User unbanned successfully',
    data: null,
  })
  @Post(':user_id/unban')
  unbanUser(@Param('user_id') user_id: string) {
    return this.userService.unbanUser(user_id);
  }

  @ApiOperation({
    summary: 'Get user',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'User fetched successfully',
    data: USER_LIST_ITEM,
  })
  @Get(':user_id')
  findOneUser(@Param('user_id') user_id: string) {
    return this.userService.findOneUser(user_id);
  }

  @ApiOperation({
    summary: 'Update user',
    description: 'ADMIN + JWT.',
  })
  @ApiSuccessResponse({
    message: 'User updated successfully',
    data: null,
  })
  @Patch(':user_id')
  updateUser(
    @Param('user_id') user_id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(user_id, updateUserDto);
  }

  @ApiOperation({
    summary: 'Delete user',
    description: 'ADMIN + JWT. Soft delete.',
  })
  @ApiSuccessResponse({
    message: 'User deleted successfully',
    data: {
      user_id: 'cluser001',
      email: 'john@example.com',
      name: 'John Driver',
      kind: 'DRIVER',
      deleted_at: '2026-06-14T10:00:00.000Z',
      deleted_records: { vehicles: 2, services: 0, subscriptions: 0 },
      stripe_customer_id: null,
    },
  })
  @Delete(':user_id')
  deleteUser(@Param('user_id') user_id: string) {
    return this.userService.deleteUser(user_id);
  }
}
