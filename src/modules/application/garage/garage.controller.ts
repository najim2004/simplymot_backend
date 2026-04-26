import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  Put,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GarageService } from './garage.service';
import {
  UpdateGarageDto,
  UpsertScheduleDto,
  UpsertServiceDto,
} from './dto/update-garage.dto';
import { User } from 'src/modules/auth/decorators/get-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { CreateBreakTimeDto, CreateHolidayDto } from './dto/create-garage.dto';
import {
  BlockUnblockSlotsDto,
  DiscoverGarageQueryDto,
  GetGarageHolidaysQueryDto,
  GetGarageSlotsQueryDto,
} from './dto/query-garage.dto';
import { OptionalJwtAuthGuard } from 'src/modules/auth/guards/optional-jwt-auth.guard';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

@ApiTags('Garage')
@ApiBearerAuth()
@Controller('garage')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @ApiSuccessResponse({
    summary: 'Get my garage',
    message: 'Garage fetched successfully',
    data: { id: 'garage_id' },
    includeAuthErrors: true,
  })
  @Get()
  getGarage(@User('id') id: string) {
    return this.garageService.getGarage(id);
  }

  @ApiSuccessResponse({
    summary: 'Discover garages',
    message: 'Garages fetched successfully',
    data: [],
    metaData: { total: 1, page: 1, limit: 10 },
  })
  @Get('discover')
  @UseGuards(OptionalJwtAuthGuard)
  discoverGarages(
    @Query() query: DiscoverGarageQueryDto,
    @User('id') user_id?: string,
  ) {
    return this.garageService.discoverGarages(query, user_id);
  }

  // ---------------- SCHEDULE ----------------
  @ApiSuccessResponse({
    summary: 'Get garage schedule',
    message: 'Schedule fetched successfully',
    data: { id: 'schedule_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':garage_id/schedule')
  getSchedule(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getSchedule(garage_id, user_id);
  }

  @ApiSuccessResponse({
    summary: 'Create or update garage schedule',
    message: 'Schedule saved successfully',
    data: { id: 'schedule_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Put(':garage_id/schedule')
  upsertSchedule(
    @Param('garage_id') garage_id: string,
    @Body() upsertSchedule: UpsertScheduleDto,
    @User('id') user_id: string,
  ) {
    return this.garageService.upsertSchedule(
      upsertSchedule,
      garage_id,
      user_id,
    );
  }

  @ApiSuccessResponse({
    summary: 'Create break time',
    message: 'Break time created successfully',
    data: { id: 'break_time_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post(':garage_id/schedule/:schedule_id/break_times')
  createBreakTime(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @Body() createBreakTimeDto: CreateBreakTimeDto,
    @User('id') user_id: string,
  ) {
    return this.garageService.createBreakTime(
      createBreakTimeDto,
      garage_id,
      schedule_id,
      user_id,
    );
  }

  @ApiSuccessResponse({
    summary: 'List break times',
    message: 'Break times fetched successfully',
    data: [],
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':garage_id/schedule/:schedule_id/break_times')
  getBreakTimes(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getBreakTimes(garage_id, schedule_id, user_id);
  }

  @ApiSuccessResponse({
    summary: 'Delete break time',
    message: 'Break time deleted successfully',
    data: { id: 'break_time_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':garage_id/schedule/:schedule_id/break_times/:break_time_id')
  deleteBreakTime(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @Param('break_time_id') break_time_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.deleteBreakTime(
      break_time_id,
      garage_id,
      schedule_id,
      user_id,
    );
  }

  @ApiSuccessResponse({
    summary: 'Create holiday',
    message: 'Holiday created successfully',
    data: { id: 'holiday_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Post(':garage_id/schedule/:schedule_id/holidays')
  createHoliday(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @Body() createHoliday: CreateHolidayDto,
    @User('id') user_id: string,
  ) {
    return this.garageService.createHoliday(
      createHoliday,
      garage_id,
      schedule_id,
      user_id,
    );
  }

  @ApiSuccessResponse({
    summary: 'List holidays',
    message: 'Holidays fetched successfully',
    data: [],
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':garage_id/schedule/:schedule_id/holidays')
  getHolidays(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @Query() query: GetGarageHolidaysQueryDto,
    @User('id') user_id: string,
  ) {
    return this.garageService.getHolidays(
      garage_id,
      schedule_id,
      user_id,
      query.year,
    );
  }

  @ApiSuccessResponse({
    summary: 'Delete holiday',
    message: 'Holiday deleted successfully',
    data: { id: 'holiday_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':garage_id/schedule/:schedule_id/holidays/:holiday_id')
  deleteHoliday(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @Param('holiday_id') holiday_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.deleteHoliday(
      holiday_id,
      garage_id,
      schedule_id,
      user_id,
    );
  }

  // ---------------- Time Slot ----------------

  @ApiSuccessResponse({
    summary: 'List garage slots',
    message: 'Slots fetched successfully',
    data: [],
    includeNotFound: true,
  })
  @Get(':garage_id/slots')
  getSlots(
    @Param('garage_id') garage_id: string,
    @Query() query: GetGarageSlotsQueryDto,
  ) {
    return this.garageService.getSlots(garage_id, query);
  }

  @ApiSuccessResponse({
    summary: 'Block garage slots',
    message: 'Slots blocked successfully',
    data: { updated_count: 1 },
    includeAuthErrors: true,
  })
  @Patch(':garage_id/slots/block')
  blockSlots(
    @Param('garage_id') garage_id: string,
    @Body() blockSlotsDto: BlockUnblockSlotsDto,
  ) {
    return this.garageService.blockUnblockSlots(
      blockSlotsDto,
      garage_id,
      'block',
    );
  }

  @ApiSuccessResponse({
    summary: 'Unblock garage slots',
    message: 'Slots unblocked successfully',
    data: { updated_count: 1 },
    includeAuthErrors: true,
  })
  @Patch(':garage_id/slots/unblock')
  unblockSlots(
    @Param('garage_id') garage_id: string,
    @Body() unblockSlotsDto: BlockUnblockSlotsDto,
  ) {
    return this.garageService.blockUnblockSlots(
      unblockSlotsDto,
      garage_id,
      'unblock',
    );
  }

  // ---------------- SERVICES ----------------
  @ApiSuccessResponse({
    summary: 'List garage services',
    message: 'Services fetched successfully',
    data: [],
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Get(':garage_id/services')
  getServices(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getServices(garage_id, user_id);
  }

  @ApiSuccessResponse({
    summary: 'Create or update garage service',
    message: 'Service saved successfully',
    data: { id: 'service_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Put(':garage_id/services')
  upsertService(
    @Param('garage_id') garage_id: string,
    @Body() upsertServiceDto: UpsertServiceDto,
    @User('id') user_id: string,
  ) {
    return this.garageService.upsertService(
      upsertServiceDto,
      garage_id,
      user_id,
    );
  }

  @ApiSuccessResponse({
    summary: 'Delete garage service',
    message: 'Service deleted successfully',
    data: { id: 'service_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Delete(':garage_id/services/:id')
  deleteService(@Param('id') id: string, @User('id') user_id: string) {
    return this.garageService.deleteService(id, user_id);
  }

  // ---------------- GENERIC ----------------

  @ApiConsumes('multipart/form-data')
  @ApiSuccessResponse({
    summary: 'Update garage profile',
    message: 'Garage updated successfully',
    data: { id: 'garage_id' },
    includeAuthErrors: true,
    includeNotFound: true,
  })
  @Patch(':garage_id')
  @UseInterceptors(
    FileInterceptor('garage_image', {
      limits: {
        fileSize: 1024 * 1024 * 20,
      },
      storage: memoryStorage(),
    }),
  )
  updateGarage(
    @Param('garage_id') garage_id: string,
    @Body() updateGarageDto: UpdateGarageDto,
    @User('id') id: string,
    @UploadedFile() garage_image: Express.Multer.File,
  ) {
    updateGarageDto.garage_image = garage_image;
    return this.garageService.updateGarage(updateGarageDto, garage_id, id);
  }
}
