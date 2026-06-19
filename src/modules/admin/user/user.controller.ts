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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/get-user.decorator';
import { QueryUserDto } from './dto/query-user.dto';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  ApproveUserResponseDto,
  BanUserResponseDto,
  CreateUserResponseDto,
  DeleteUserResponseDto,
  GetUserResponseDto,
  ListUsersResponseDto,
  RejectUserResponseDto,
  UnbanUserResponseDto,
  UpdateUserResponseDto,
} from './dto/swagger/user-api.dto';

@ApiBearerAuth()
@ApiTags('Admin Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @apiTypedDoc(
    {
      summary: 'Create user',
      description: 'ADMIN + JWT.',
    },
    { type: CreateUserResponseDto, status: HttpStatus.CREATED },
  )
  @Post()
  createUser(
    @Body() createUserDto: CreateUserDto,
    @User('id') currentUserId: string,
  ) {
    return this.userService.createUser(createUserDto, currentUserId);
  }

  @apiTypedDoc(
    {
      summary: 'List users',
      description: 'ADMIN + JWT. Paginated with filters.',
    },
    { type: ListUsersResponseDto },
  )
  @Get()
  findAllUsers(@Query() queryUserDto: QueryUserDto) {
    return this.userService.findAllUsers(queryUserDto);
  }

  @apiTypedDoc(
    {
      summary: 'Approve user',
      description: 'ADMIN + JWT.',
    },
    { type: ApproveUserResponseDto },
  )
  @Post(':user_id/approve')
  approveUser(@Param('user_id') user_id: string) {
    return this.userService.approveUser(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Reject user',
      description: 'ADMIN + JWT.',
    },
    { type: RejectUserResponseDto },
  )
  @Post(':user_id/reject')
  rejectUser(@Param('user_id') user_id: string) {
    return this.userService.rejectUser(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Ban user',
      description: 'ADMIN + JWT. Cancels garage subscriptions.',
    },
    { type: BanUserResponseDto },
  )
  @Post(':user_id/ban')
  banUser(@Param('user_id') user_id: string) {
    return this.userService.banUser(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Unban user',
      description: 'ADMIN + JWT.',
    },
    { type: UnbanUserResponseDto },
  )
  @Post(':user_id/unban')
  unbanUser(@Param('user_id') user_id: string) {
    return this.userService.unbanUser(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get user',
      description: 'ADMIN + JWT.',
    },
    { type: GetUserResponseDto },
  )
  @Get(':user_id')
  findOneUser(@Param('user_id') user_id: string) {
    return this.userService.findOneUser(user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Update user',
      description: 'ADMIN + JWT.',
    },
    { type: UpdateUserResponseDto },
  )
  @Patch(':user_id')
  updateUser(
    @Param('user_id') user_id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.userService.updateUser(user_id, updateUserDto);
  }

  @apiTypedDoc(
    {
      summary: 'Delete user',
      description: 'ADMIN + JWT. Soft delete.',
    },
    { type: DeleteUserResponseDto },
  )
  @Delete(':user_id')
  deleteUser(@Param('user_id') user_id: string) {
    return this.userService.deleteUser(user_id);
  }
}
