import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  Validate,
  ValidateIf,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'RescheduleIsEndAfterStart', async: false })
class RescheduleIsEndAfterStartConstraint
  implements ValidatorConstraintInterface
{
  validate(endTime: Date, args: ValidationArguments) {
    const dto = args.object as RescheduleBookingDto;
    if (dto.slot_id || !dto.start_time || !endTime) {
      return true;
    }

    return new Date(endTime).getTime() > new Date(dto.start_time).getTime();
  }

  defaultMessage() {
    return 'end_time must be after start_time';
  }
}

@ValidatorConstraint({ name: 'RescheduleIsFutureDate', async: false })
class RescheduleIsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: Date, args: ValidationArguments) {
    const dto = args.object as RescheduleBookingDto;
    if (dto.slot_id || !value) {
      return true;
    }

    return new Date(value).getTime() > Date.now();
  }

  defaultMessage() {
    return 'Cannot reschedule to a past slot';
  }
}

export class CancelBookingDto {
  @ApiProperty({
    description: 'Reason for cancelling the booking',
    example: 'Vehicle no longer available',
  })
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class RescheduleBookingDto {
  @ApiPropertyOptional({
    description:
      'Existing slot ID. If omitted, start_time and end_time are required.',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slot_id?: string;

  @ApiPropertyOptional({
    description:
      'New slot start time (ISO datetime). Required when slot_id is not provided.',
    example: '2026-06-20T09:00:00.000Z',
  })
  @ValidateIf((dto) => !dto.slot_id)
  @IsNotEmpty({
    message: 'start_time is required when slot_id is not provided',
  })
  @Type(() => Date)
  @IsDate()
  start_time?: Date;

  @ApiPropertyOptional({
    description:
      'New slot end time (ISO datetime). Required when slot_id is not provided.',
    example: '2026-06-20T10:00:00.000Z',
  })
  @ValidateIf((dto) => !dto.slot_id)
  @IsNotEmpty({ message: 'end_time is required when slot_id is not provided' })
  @Type(() => Date)
  @IsDate()
  @Validate(RescheduleIsEndAfterStartConstraint)
  @Validate(RescheduleIsFutureDateConstraint)
  end_time?: Date;
}
