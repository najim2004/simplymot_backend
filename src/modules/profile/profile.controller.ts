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
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  CreateProfileResponseDto,
  DeleteProfileResponseDto,
  GetProfileResponseDto,
  ListProfilesResponseDto,
  UpdateProfileResponseDto,
} from './dto/swagger/profile-api.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @apiTypedDoc(
    {
      summary: 'Create profile',
      description: 'Internal scaffold endpoint.',
    },
    { type: CreateProfileResponseDto },
  )
  @Post()
  create(@Body() createProfileDto: CreateProfileDto) {
    return this.profileService.create(createProfileDto);
  }

  @apiTypedDoc(
    {
      summary: 'List profiles',
      description: 'Internal scaffold endpoint.',
    },
    { type: ListProfilesResponseDto },
  )
  @Get()
  findAll() {
    return this.profileService.findAll();
  }

  @apiTypedDoc(
    {
      summary: 'Get profile',
      description: 'Internal scaffold endpoint.',
    },
    { type: GetProfileResponseDto },
  )
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.profileService.findOne(+id);
  }

  @apiTypedDoc(
    {
      summary: 'Update profile',
      description: 'Internal scaffold endpoint.',
    },
    { type: UpdateProfileResponseDto },
  )
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.update(+id, updateProfileDto);
  }

  @apiTypedDoc(
    {
      summary: 'Delete profile',
      description: 'Internal scaffold endpoint.',
    },
    { type: DeleteProfileResponseDto },
  )
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.profileService.remove(+id);
  }
}
