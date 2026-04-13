import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

/** Used with `multipart/form-data`; all fields optional. */
export class UpdateUserDto {
  @ApiPropertyOptional({
    description: 'Full legal name of the user',
    example: 'John Doe',
    minLength: 2,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Contact number (E.164 or local format)',
    example: '+19876543210',
  })
  @IsOptional()
  @IsString()
  phone_number?: string;

  @ApiPropertyOptional({
    description: 'Binary file when using multipart (field name: avatar)',
    type: 'string',
    format: 'binary',
  })
  @IsOptional()
  avatar?: Express.Multer.File;
}
