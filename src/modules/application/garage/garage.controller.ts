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
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ApiSuccessResponse } from 'src/common/decorators/swagger-response.decorator';

const MY_GARAGE = {
  id: 'clgarage001',
  garage_name: 'City MOT Centre',
  vts_number: 'VTS12345',
  contact_email: 'contact@citymot.co.uk',
  phone_number: '+441234567890',
  address: '12 High Street, London',
  garage_image: 'https://cdn.example.com/storage/garages/cover.jpg',
  mot_price: 45.0,
};

const DISCOVER = {
  vehicle: {
    id: 'clvehicle001',
    registration_number: 'AB12CDE',
    make: 'FORD',
    model: 'FOCUS',
    color: 'Blue',
    fuel_type: 'Petrol',
    engine_capacity: 1596,
    co2_emissions: 120,
    mot_status: 'Valid',
    is_expired: false,
    mot_expiry_date: '2026-08-15T00:00:00.000Z',
    mot_last_checked_at: '2026-03-01T10:00:00.000Z',
    reminder_last_sent_at: null,
    year_of_manufacture: 2019,
  },
  garages: [
    {
      id: 'clgarage001',
      garage_name: 'City MOT Centre',
      address: '12 High Street, London',
      post_code: 'SW1A 1AA',
      vts_number: 'VTS12345',
      phone_number: '+441234567890',
      garage_image: 'https://cdn.example.com/storage/garages/cover.jpg',
      mot_price: 45.0,
      total_bookings: 128,
      exact_post_code_match: true,
      distance_miles: 0.5,
    },
  ],
};

const DISCOVER_META = {
  page: 1,
  limit: 10,
  total: 25,
  vehicle_registration_number: 'AB12CDE',
  post_code: 'SW1A 1AA',
  filters: { sort: 'DISTANCE', sort_order: 'ASC' },
};

const DISCOVER_DETAIL = {
  id: 'clgarage001',
  garage_name: 'City MOT Centre',
  vts_number: 'VTS12345',
  contact_email: 'contact@citymot.co.uk',
  phone_number: '+441234567890',
  address: '12 High Street, London',
  post_code: 'SW1A 1AA',
  garage_image: 'https://cdn.example.com/storage/garages/cover.jpg',
  services: {
    mot: { id: 'clsrv001', title: 'MOT Test', price: 45.0, type: 'MOT' },
    mot_retest: {
      id: 'clsrv002',
      title: 'MOT Retest',
      price: 25.0,
      type: 'RETEST',
    },
    other_services: [
      {
        id: 'clsrv003',
        title: 'Full Service',
        price: 199.0,
        type: 'OTHER',
      },
    ],
  },
  schedule: {
    id: 'clsched001',
    schedule_intervals: [
      {
        id: 'clint001',
        day_of_week: 'MONDAY',
        is_closed: false,
        slot_duration: 60,
        buffer_time: 15,
        open_time: '1970-01-01T09:00:00.000Z',
        close_time: '1970-01-01T17:00:00.000Z',
      },
    ],
  },
};

const SCHEDULE = {
  id: 'clsched001',
  garage_id: 'clgarage001',
  schedule_intervals: [
    {
      id: 'clint001',
      day_of_week: 'MONDAY',
      is_closed: false,
      slot_duration: 60,
      buffer_time: 15,
      open_time: '1970-01-01T09:00:00.000Z',
      close_time: '1970-01-01T17:00:00.000Z',
    },
  ],
};

const BREAK_TIME = {
  id: 'clbreak001',
  starts_at: '1970-01-01T12:00:00.000Z',
  ends_at: '1970-01-01T13:00:00.000Z',
  description: 'Lunch break',
};

const BREAK_TIMES = [BREAK_TIME];

const HOLIDAY = {
  id: 'clhol001',
  date: '2026-12-25T00:00:00.000Z',
  name: 'Christmas',
};

const HOLIDAYS = [HOLIDAY];

const SLOTS = {
  garage_id: 'clgarage001',
  schedule_id: 'clsched001',
  date: '2026-06-20',
  day_of_week: 'SATURDAY',
  is_closed: false,
  is_holiday: false,
  holiday_name: null,
  slot_duration: 60,
  buffer_time: 15,
  open_time: '09:00',
  close_time: '17:00',
  slots: [
    {
      id: 'clslot001',
      starts_at: '2026-06-20T09:00:00.000Z',
      ends_at: '2026-06-20T10:00:00.000Z',
      source: 'TEMPLATE',
      status: 'AVAILABLE',
      bookable: true,
      description: null,
    },
    {
      id: 'clslot002',
      starts_at: '2026-06-20T10:00:00.000Z',
      ends_at: '2026-06-20T11:00:00.000Z',
      source: 'DB',
      status: 'BOOKED',
      bookable: false,
      description: null,
    },
  ],
  summary: {
    total_slots: 8,
    past_slots: 2,
    break_slots: 1,
    available_slots: 4,
    booked_slots: 1,
    blocked_slots: 0,
    bookable_slots: 4,
  },
};

const SLOT_ACTION = {
  id: 'clslot003',
  starts_at: '2026-06-20T14:00:00.000Z',
  ends_at: '2026-06-20T15:00:00.000Z',
  source: 'DB',
  status: 'BLOCKED',
  bookable: false,
  description: 'Staff meeting',
};

const SERVICES = {
  mot: { id: 'clsrv001', title: 'MOT Test', price: 45.0, type: 'MOT' },
  mot_retest: {
    id: 'clsrv002',
    title: 'MOT Retest',
    price: 25.0,
    type: 'RETEST',
  },
  other_services: [
    { id: 'clsrv003', title: 'Full Service', price: 199.0, type: 'OTHER' },
  ],
};

const SERVICE_LIST = [
  { id: 'clsrv001', title: 'MOT Test', price: 45.0, type: 'MOT' },
  { id: 'clsrv003', title: 'Full Service', price: 199.0, type: 'OTHER' },
];

@ApiTags('Garage')
@ApiBearerAuth()
@Controller('garages')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @ApiOperation({
    summary: 'Get my garage',
    description:
      'GARAGE role + JWT. Returns owned garage profile summary.',
  })
  @ApiSuccessResponse({
    message: 'Garage fetched successfully',
    data: MY_GARAGE,
  })
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getGarage(@User('id') id: string) {
    return this.garageService.getGarage(id);
  }

  @ApiOperation({
    summary: 'Discover garages',
    description:
      'Public (JWT optional). Query: `post_code` (required), `vehicle_registration_number`, `page`, `limit`, `sort`, `sort_order`.',
  })
  @ApiSuccessResponse({
    message: 'Garages discovered successfully',
    data: DISCOVER,
    metaData: DISCOVER_META,
  })
  @Get('discover')
  @UseGuards(OptionalJwtAuthGuard)
  discoverGarages(
    @Query() query: DiscoverGarageQueryDto,
    @User('id') user_id?: string,
  ) {
    return this.garageService.discoverGarages(query, user_id);
  }

  @ApiOperation({
    summary: 'Get garage public details',
    description:
      'Public. Returns garage profile, services (mot/mot_retest/other), and weekly schedule for drivers.',
  })
  @ApiSuccessResponse({
    message: 'Garage details fetched successfully',
    data: DISCOVER_DETAIL,
  })
  @Get('discover/:garage_id')
  @UseGuards(OptionalJwtAuthGuard)
  discoverGarage(@Param('garage_id') garage_id: string) {
    return this.garageService.discoverGarage(garage_id);
  }

  @ApiOperation({
    summary: 'Get schedule',
    description:
      'GARAGE + JWT. Returns weekly `schedule_intervals`.',
  })
  @ApiSuccessResponse({
    message: 'Schedule fetched successfully',
    data: SCHEDULE,
  })
  @Get(':garage_id/schedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getSchedule(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getSchedule(garage_id, user_id);
  }

  @ApiOperation({
    summary: 'Create or update schedule',
    description:
      'GARAGE + JWT. PUT body: day intervals with `day_of_week`, `open_time`, `close_time`, `slot_duration`, `buffer_time`, `is_closed`.',
  })
  @ApiSuccessResponse({
    message: 'Schedule saved successfully',
    data: SCHEDULE,
  })
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

  @ApiOperation({
    summary: 'Create break time',
    description:
      'GARAGE + JWT. Adds a daily break window to a schedule.',
  })
  @ApiSuccessResponse({
    message: 'Break time created successfully',
    data: BREAK_TIME,
  })
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

  @ApiOperation({
    summary: 'List break times',
    description:
      'GARAGE + JWT. Lists breaks for a schedule.',
  })
  @ApiSuccessResponse({
    message: 'Break times fetched successfully',
    data: BREAK_TIMES,
  })
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

  @ApiOperation({
    summary: 'Delete break time',
    description:
      'GARAGE + JWT. Removes a break from schedule.',
  })
  @ApiSuccessResponse({
    message: 'Break time deleted successfully',
    data: BREAK_TIME,
  })
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

  @ApiOperation({
    summary: 'Create holiday',
    description:
      'GARAGE + JWT. Blocks a calendar date.',
  })
  @ApiSuccessResponse({
    message: 'Holiday created successfully',
    data: HOLIDAY,
  })
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

  @ApiOperation({
    summary: 'List holidays',
    description:
      'GARAGE + JWT. Optional query `year` filters holidays.',
  })
  @ApiSuccessResponse({
    message: 'Holidays fetched successfully',
    data: HOLIDAYS,
  })
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

  @ApiOperation({
    summary: 'Delete holiday',
    description:
      'GARAGE + JWT. Removes a holiday entry.',
  })
  @ApiSuccessResponse({
    message: 'Holiday deleted successfully',
    data: HOLIDAY,
  })
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

  @ApiOperation({
    summary: 'List slots by date',
    description:
      'Public. Query `date=YYYY-MM-DD`. Returns slots with `bookable` and `status` (AVAILABLE/BOOKED/BLOCKED/PAST).',
  })
  @ApiSuccessResponse({
    message: 'Slots fetched successfully',
    data: SLOTS,
  })
  @Get(':garage_id/slots')
  @UseGuards(OptionalJwtAuthGuard)
  getSlots(
    @Param('garage_id') garage_id: string,
    @Query() query: GetGarageSlotsQueryDto,
  ) {
    return this.garageService.getSlots(garage_id, query);
  }

  @ApiOperation({
    summary: 'Block slots',
    description:
      'GARAGE + JWT. Body: `id` OR `start_time`/`end_time`.',
  })
  @ApiSuccessResponse({
    message: 'Slot blocked successfully',
    data: SLOT_ACTION,
  })
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

  @ApiOperation({
    summary: 'Unblock slots',
    description:
      'GARAGE + JWT. Restores blocked slot(s) to AVAILABLE.',
  })
  @ApiSuccessResponse({
    message: 'Slot unblocked successfully',
    data: {
      ...SLOT_ACTION,
      status: 'AVAILABLE',
      bookable: true,
      description: null,
    },
  })
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

  @ApiOperation({
    summary: 'List services',
    description:
      'GARAGE + JWT. Returns mot, mot_retest, and other_services.',
  })
  @ApiSuccessResponse({
    message: 'Services fetched successfully',
    data: SERVICES,
  })
  @Get(':garage_id/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  getServices(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getServices(garage_id, user_id);
  }

  @ApiOperation({
    summary: 'Create or update services',
    description:
      'GARAGE + JWT. Upserts MOT, retest and additional services.',
  })
  @ApiSuccessResponse({
    message: 'Service saved successfully',
    data: SERVICE_LIST,
  })
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

  @ApiOperation({
    summary: 'Delete service',
    description:
      'GARAGE + JWT. Deletes a service by id.',
  })
  @ApiSuccessResponse({
    message: 'Service deleted successfully',
    data: { id: 'clsrv003' },
  })
  @Delete(':garage_id/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.GARAGE)
  deleteService(@Param('id') id: string, @User('id') user_id: string) {
    return this.garageService.deleteService(id, user_id);
  }

  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update garage profile',
    description:
      'GARAGE + JWT. Multipart update for garage fields and `garage_image`.',
  })
  @ApiSuccessResponse({
    message: 'Garage updated successfully',
    data: MY_GARAGE,
  })
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
