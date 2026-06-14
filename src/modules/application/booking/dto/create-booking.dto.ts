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
    if (dto.slot_id || !dto.start_time || !endTime) {
      return true;
    }

    return new Date(endTime).getTime() > new Date(dto.start_time).getTime();
  }

  defaultMessage() {
    return 'end_time must be after start_time';
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
      'Existing slot ID. If omitted, start_time and end_time are required.',
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
  @IsNotEmpty({ message: 'start_time is required when slot_id is not provided' })
  @Type(() => Date)
  @IsDate()
  start_time?: Date;

  @ApiPropertyOptional({
    description:
      'Slot end time (ISO datetime). Required when slot_id is not provided.',
    example: '2026-06-20T10:00:00.000Z',
  })
  @ValidateIf((dto) => !dto.slot_id)
  @IsNotEmpty({ message: 'end_time is required when slot_id is not provided' })
  @Type(() => Date)
  @IsDate()
  @Validate(IsEndAfterStartConstraint)
  @Validate(IsFutureDateConstraint)
  end_time?: Date;

  @ApiPropertyOptional({
    description: 'Additional services or notes for the garage',
    example: 'Check tyres',
  })
  @IsOptional()
  @IsString()
  additional_services?: string;
}
