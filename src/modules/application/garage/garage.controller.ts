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
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { apiTypedDoc } from 'src/common/swagger/api-doc';
import {
  BreakTimeResponseDto,
  BreakTimesListResponseDto,
  DeleteServiceResponseDto,
  DiscoverGarageResponseDto,
  DiscoverGaragesResponseDto,
  GetGarageResponseDto,
  HolidayResponseDto,
  HolidaysListResponseDto,
  ScheduleResponseDto,
  ServiceListResponseDto,
  ServicesBundleResponseDto,
  SlotActionResponseDto,
  SlotsResponseDto,
  UpdateGarageResponseDto,
} from './dto/swagger/garage-api.dto';

@ApiTags('Garage')
@ApiBearerAuth()
@Controller('garages')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @apiTypedDoc(
    {
      summary: 'Get my garage',
      description:
        'GARAGE role + JWT. Returns owned garage profile summary.',
    },
    { type: GetGarageResponseDto },
  )
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getGarage(@User('id') id: string) {
    return this.garageService.getGarage(id);
  }

  @apiTypedDoc(
    {
      summary: 'Discover garages',
      description:
        'Public (JWT optional). Query: `post_code` (required), `vehicle_registration_number`, `page`, `limit`, `sort`, `sort_order`.',
    },
    { type: DiscoverGaragesResponseDto },
  )
  @Get('discover')
  @UseGuards(OptionalJwtAuthGuard)
  discoverGarages(
    @Query() query: DiscoverGarageQueryDto,
    @User('id') user_id?: string,
  ) {
    return this.garageService.discoverGarages(query, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get garage public details',
      description:
        'Public. Returns garage profile, services (mot/mot_retest/other), and weekly schedule for drivers.',
    },
    { type: DiscoverGarageResponseDto },
  )
  @Get('discover/:garage_id')
  @UseGuards(OptionalJwtAuthGuard)
  discoverGarage(@Param('garage_id') garage_id: string) {
    return this.garageService.discoverGarage(garage_id);
  }

  @apiTypedDoc(
    {
      summary: 'Get schedule',
      description: 'GARAGE + JWT. Returns weekly `schedule_intervals`.',
    },
    { type: ScheduleResponseDto },
  )
  @Get(':garage_id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getSchedule(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getSchedule(garage_id, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Create or update schedule',
      description:
        'GARAGE + JWT. PUT body: day intervals with `day_of_week`, `open_time`, `close_time`, `slot_duration`, `buffer_time`, `is_closed`.',
    },
    { type: ScheduleResponseDto },
  )
  @Put(':garage_id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'Create break time',
      description: 'GARAGE + JWT. Adds a daily break window to a schedule.',
    },
    { type: BreakTimeResponseDto },
  )
  @Post(':garage_id/schedule/:schedule_id/break_times')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'List break times',
      description: 'GARAGE + JWT. Lists breaks for a schedule.',
    },
    { type: BreakTimesListResponseDto },
  )
  @Get(':garage_id/schedule/:schedule_id/break_times')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getBreakTimes(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getBreakTimes(garage_id, schedule_id, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Delete break time',
      description: 'GARAGE + JWT. Removes a break from schedule.',
    },
    { type: BreakTimeResponseDto },
  )
  @Delete(':garage_id/schedule/:schedule_id/break_times/:break_time_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'Create holiday',
      description: 'GARAGE + JWT. Blocks a calendar date.',
    },
    { type: HolidayResponseDto },
  )
  @Post(':garage_id/schedule/:schedule_id/holidays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'List holidays',
      description: 'GARAGE + JWT. Optional query `year` filters holidays.',
    },
    { type: HolidaysListResponseDto },
  )
  @Get(':garage_id/schedule/:schedule_id/holidays')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'Delete holiday',
      description: 'GARAGE + JWT. Removes a holiday entry.',
    },
    { type: HolidayResponseDto },
  )
  @Delete(':garage_id/schedule/:schedule_id/holidays/:holiday_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'List slots by date',
      description:
        'Public. Query `date=YYYY-MM-DD`. Returns slots with `bookable` and `status` (AVAILABLE/BOOKED/BLOCKED/PAST).',
    },
    { type: SlotsResponseDto },
  )
  @Get(':garage_id/slots')
  @UseGuards(OptionalJwtAuthGuard)
  getSlots(
    @Param('garage_id') garage_id: string,
    @Query() query: GetGarageSlotsQueryDto,
  ) {
    return this.garageService.getSlots(garage_id, query);
  }

  @apiTypedDoc(
    {
      summary: 'Block slots',
      description: 'GARAGE + JWT. Body: `id` OR `start_time`/`end_time`.',
    },
    { type: SlotActionResponseDto },
  )
  @Patch(':garage_id/slots/block')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'Unblock slots',
      description: 'GARAGE + JWT. Restores blocked slot(s) to AVAILABLE.',
    },
    { type: SlotActionResponseDto },
  )
  @Patch(':garage_id/slots/unblock')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'List services',
      description: 'GARAGE + JWT. Returns mot, mot_retest, and other_services.',
    },
    { type: ServicesBundleResponseDto },
  )
  @Get(':garage_id/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getServices(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getServices(garage_id, user_id);
  }

  @apiTypedDoc(
    {
      summary: 'Create or update services',
      description: 'GARAGE + JWT. Upserts MOT, retest and additional services.',
    },
    { type: ServiceListResponseDto },
  )
  @Put(':garage_id/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
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

  @apiTypedDoc(
    {
      summary: 'Delete service',
      description: 'GARAGE + JWT. Deletes a service by id.',
    },
    { type: DeleteServiceResponseDto },
  )
  @Delete(':garage_id/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  deleteService(@Param('id') id: string, @User('id') user_id: string) {
    return this.garageService.deleteService(id, user_id);
  }

  @ApiConsumes('multipart/form-data')
  @apiTypedDoc(
    {
      summary: 'Update garage profile',
      description:
        'GARAGE + JWT. Multipart update for garage fields and `garage_image`.',
    },
    { type: UpdateGarageResponseDto },
  )
  @Patch(':garage_id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  @UseInterceptors(
    FileInterceptor('garage_image', {
      limits: { fileSize: 1024 * 1024 * 20 },
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
