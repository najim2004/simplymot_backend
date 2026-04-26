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
import { ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @ApiSuccessResponse({
    summary: 'Create profile',
    message: 'Profile created successfully',
    data: { id: 'profile_id' },
  })
  @Post()
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
  }

  @ApiSuccessResponse({
    summary: 'List profiles',
    message: 'Profiles fetched successfully',
    data: [],
  })
  @Get()
  findAll() {
    return this.profileService.findAll();
  }

  @ApiSuccessResponse({
    summary: 'Get profile',
    message: 'Profile fetched successfully',
    data: { id: 'profile_id' },
    includeNotFound: true,
  })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(+id);
  }

  @ApiSuccessResponse({
    summary: 'Update profile',
    message: 'Profile updated successfully',
    data: { id: 'profile_id' },
    includeNotFound: true,
  })
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(+id, updateProfileDto);
  }

  @ApiSuccessResponse({
    summary: 'Delete profile',
    message: 'Profile deleted successfully',
    data: { id: 'profile_id' },
    includeNotFound: true,
  })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profileService.remove(+id);
  }
}
