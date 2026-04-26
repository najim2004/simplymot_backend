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
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { User } from '../../auth/decorators/get-user.decorator';
import { QueryUserDto } from './dto/query-user.dto';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiBearerAuth()
@ApiTags('User')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiResponse({ description: 'Create a user' })
  @ApiSuccessResponse({
    summary: 'Create a user',
    message: 'User created successfully',
    status: HttpStatus.CREATED,
    data: { id: 'user_id' },
    includeAuthErrors: true,
  })
  @Post()
  createUser(
    @Body() createUserDto: CreateUserDto,
    @User('id') currentUserId: string,
  ) {
    return this.userService.createUser(createUserDto, currentUserId);
  }

  @ApiResponse({ description: 'Get all users' })
  @ApiSuccessResponse({
    summary: 'Get all users',
    message: 'Users fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
    includeAuthErrors: true,
  })
  @Get()
  findAllUsers(@Query() queryUserDto: QueryUserDto) {
    return this.userService.findAllUsers(queryUserDto);
  }

  // approve user
  @Roles(Role.ADMIN)
  @ApiResponse({ description: 'Approve a user' })
  @ApiSuccessResponse({
    summary: 'Approve a user',
    message: 'User approved successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post(':id/approve')
  approveUser(@Param('id') id: string) {
    return this.userService.approveUser(id);
  }

  // reject user
  @Roles(Role.ADMIN)
  @ApiResponse({ description: 'Reject a user' })
  @ApiSuccessResponse({
    summary: 'Reject a user',
    message: 'User rejected successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post(':id/reject')
  rejectUser(@Param('id') id: string) {
    return this.userService.rejectUser(id);
  }
  @ApiSuccessResponse({
    summary: 'Ban a user',
    message: 'User banned successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post(':id/ban')
  banUser(@Param('id') id: string) {
    return this.userService.banUser(id);
  }

  @ApiSuccessResponse({
    summary: 'Unban a user',
    message: 'User unbanned successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post(':id/unban')
  unbanUser(@Param('id') id: string) {
    return this.userService.unbanUser(id);
  }

  @ApiResponse({ description: 'Get a user by id' })
  @ApiSuccessResponse({
    summary: 'Get a user by id',
    message: 'User fetched successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':id')
  findOneUser(@Param('id') id: string) {
    return this.userService.findOneUser(id);
  }

  @ApiSuccessResponse({
    summary: 'Update a user',
    message: 'User updated successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':id')
  updateUser(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.updateUser(id, updateUserDto);
  }

  @ApiSuccessResponse({
    summary: 'Delete a user',
    message: 'User deleted successfully',
    data: { id: 'user_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':id')
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}
