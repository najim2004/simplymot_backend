import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class AddVehicleDto {
  @ApiProperty({
    example: 'AB12CD',
    description: 'Registration number of the vehicle',
  })
  @IsNotEmpty()
  @IsString()
  registration_number: string;
}
