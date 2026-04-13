import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({
    description: 'Human-readable label shown in admin UI',
    example: 'Regional Manager',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description:
      'Stable slug (lowercase, digits, underscores). Used in code and APIs.',
    example: 'regional_manager',
    maxLength: 100,
    pattern: '^[a-z0-9_]+$',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  @Matches(/^[a-z0-9_]+$/, {
    message: 'name must be lowercase alphanumeric with underscores',
  })
  name: string;
}
