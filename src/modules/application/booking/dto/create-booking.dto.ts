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

@ValidatorConstraint({ name: 'IsEndAfterStart', async: false })
class IsEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(endTime: Date, args: ValidationArguments) {
    const dto = args.object as CreateBookingDto;
    if (dto.slot_id || !dto.starts_at || !endTime) {
      return true;
    }

    return new Date(endTime).getTime() > new Date(dto.starts_at).getTime();
  }

  defaultMessage() {
    return 'ends_at must be after starts_at';
  }
}

@ValidatorConstraint({ name: 'IsFutureDate', async: false })
class IsFutureDateConstraint implements ValidatorConstraintInterface {
  validate(value: Date, args: ValidationArguments) {
    const dto = args.object as CreateBookingDto;
    if (dto.slot_id || !value) {
      return true;
    }

    return new Date(value).getTime() > Date.now();
  }

  defaultMessage() {
    return 'Cannot book a past slot';
  }
}

export class CreateBookingDto {
  @ApiProperty({
    description: 'Garage ID',
    example: 'clx1234567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  garage_id: string;

  @ApiPropertyOptional({
    description:
      'Existing slot ID. If omitted, starts_at and ends_at are required.',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  slot_id?: string;

  @ApiPropertyOptional({
    description:
      'Slot start time (ISO datetime). Required when slot_id is not provided.',
    example: '2026-06-20T09:00:00.000Z',
  })
  @ValidateIf((dto) => !dto.slot_id)
  @IsNotEmpty({
    message: 'starts_at is required when slot_id is not provided',
  })
  @Type(() => Date)
  @IsDate()
  starts_at?: Date;

  @ApiPropertyOptional({
    description:
      'Slot end time (ISO datetime). Required when slot_id is not provided.',
    example: '2026-06-20T10:00:00.000Z',
  })
  @ValidateIf((dto) => !dto.slot_id)
  @IsNotEmpty({ message: 'ends_at is required when slot_id is not provided' })
  @Type(() => Date)
  @IsDate()
  @Validate(IsEndAfterStartConstraint)
  @Validate(IsFutureDateConstraint)
  ends_at?: Date;

  @ApiPropertyOptional({
    description: 'Additional services or notes for the garage',
    example: 'Check tyres',
  })
  @IsOptional()
  @IsString()
  additional_services?: string;

  @ApiPropertyOptional({
    description:
      'Vehicle ID (must belong to the authenticated user). ' +
      'If omitted, vehicle_registration_number is used to find or create the vehicle.',
    example: 'clx1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vehicle_id?: string;

  @ApiPropertyOptional({
    description:
      'Vehicle registration number. Used when vehicle_id is not provided. ' +
      'The system will find the vehicle in the database and link it to the user, ' +
      'or create a new entry if it does not exist yet.',
    example: 'AB12CDE',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  vehicle_registration_number?: string;
}
