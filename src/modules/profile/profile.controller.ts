import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ProfileService } from './profile.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';
@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiOperation({
    summary: 'Create profile',
    description: 'Internal scaffold endpoint.',
  })
  @ApiSuccessResponse({
    message: 'Profile created successfully',
    data: { id: 'profile_id' },
  })
  @Post()
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
  }

  @ApiOperation({
    summary: 'List profiles',
    description: 'Internal scaffold endpoint.',
  })
  @ApiSuccessResponse({
    message: 'Profiles fetched successfully',
    data: [],
  })
  @Get()
  findAll() {
    return this.profileService.findAll();
  }

  @ApiOperation({
    summary: 'Get profile',
    description: 'Internal scaffold endpoint.',
  })
  @ApiSuccessResponse({
    message: 'Profile fetched successfully',
    data: { id: 'profile_id' },
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(+id);
  }

  @ApiOperation({
    summary: 'Update profile',
    description: 'Internal scaffold endpoint.',
  })
  @ApiSuccessResponse({
    message: 'Profile updated successfully',
    data: { id: 'profile_id' },
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(+id, updateProfileDto);
  }

  @ApiOperation({
    summary: 'Delete profile',
    description: 'Internal scaffold endpoint.',
  })
  @ApiSuccessResponse({
    message: 'Profile deleted successfully',
    data: { id: 'profile_id' },
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profileService.remove(+id);
  }
}
