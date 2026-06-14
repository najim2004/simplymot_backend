import { ApiProperty } from '@nestjs/swagger';
import { ArrayNotEmpty, IsArray, IsEnum, IsString } from 'class-validator';
import { SetRolePermissionsMode } from './set-role-permissions-mode.enum';

export class SetRolePermissionsDto {
  @ApiProperty({
    enum: SetRolePermissionsMode,
    description:
      '`assign`: add links; `replace`: clear then add; `remove`: unlink selected',
    example: SetRolePermissionsMode.assign,
  })
  @IsEnum(SetRolePermissionsMode)
  mode: SetRolePermissionsMode;

  @ApiProperty({
    description: 'Permission primary keys (cuid)',
    example: ['clxxxxxxxxxxxxxxxxxxxxxxxx', 'clyyyyyyyyyyyyyyyyyyyyyyyy'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  permission_ids: string[];
}
