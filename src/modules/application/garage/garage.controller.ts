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
import { GetGarageHolidaysQueryDto } from './dto/query-garage.dto';

@Controller('garage')
export class GarageController {
  constructor(private readonly garageService: GarageService) {}

  @Get()
  getGarage(@User('id') id: string) {
    return this.garageService.getGarage(id);
  }

  @Get('search')
  searchGarage(@Query() query: QueryGarageDto) {
    return this.garageService.searchGarage(query);
  }

  // ---------------- SCHEDULE ----------------
  @Get(':garage_id/schedule')
  getSchedule(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getSchedule(garage_id, user_id);
  }

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

  @Get(':garage_id/schedule/:schedule_id/break_times')
  getBreakTimes(
    @Param('garage_id') garage_id: string,
    @Param('schedule_id') schedule_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getBreakTimes(garage_id, schedule_id, user_id);
  }

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

  // ---------------- SERVICES ----------------

  @Get(':garage_id/services')
  getServices(
    @Param('garage_id') garage_id: string,
    @User('id') user_id: string,
  ) {
    return this.garageService.getServices(garage_id, user_id);
  }

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

  @Delete(':garage_id/services/:id')
  deleteService(@Param('id') id: string, @User('id') user_id: string) {
    return this.garageService.deleteService(id, user_id);
  }

  // ---------------- GENERIC ----------------

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
