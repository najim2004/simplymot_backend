import { ApiProperty } from '@nestjs/swagger';
import { IdOnlyDto } from 'src/common/swagger/dto/api-response.dto';

export class ProfileDto {
  @ApiProperty()
  id: string;
}

export class CreateProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: ProfileDto })
  data: ProfileDto;
}

export class ListProfilesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [ProfileDto] })
  data: ProfileDto[];
}

export class GetProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: ProfileDto })
  data: ProfileDto;
}

export class UpdateProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: ProfileDto })
  data: ProfileDto;
}

export class DeleteProfileResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: IdOnlyDto })
  data: IdOnlyDto;
}
