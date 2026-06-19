import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationMetaDto } from 'src/common/swagger/dto/api-response.dto';

export class AdminGarageListItemDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  garage_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  contact_email: string | null;

  @ApiPropertyOptional({ nullable: true })
  vts_number: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  created_at: Date;

  @ApiProperty()
  status: string;
}

export class AdminGarageOwnerDto {
  @ApiProperty()
  status: string;

  @ApiPropertyOptional({ nullable: true })
  name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  avatar: string | null;
}

export class AdminGarageDetailDto extends AdminGarageListItemDto {
  @ApiPropertyOptional({ nullable: true })
  garage_image: string | null;

  @ApiPropertyOptional({ nullable: true })
  address: string | null;

  @ApiProperty({ type: AdminGarageOwnerDto })
  owner: AdminGarageOwnerDto;
}

export class AdminListGaragesResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: [AdminGarageListItemDto] })
  data: AdminGarageListItemDto[];

  @ApiProperty({ name: 'meta_data', type: PaginationMetaDto })
  meta_data: PaginationMetaDto;
}

export class AdminGetGarageResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty()
  message: string;

  @ApiProperty({ type: AdminGarageDetailDto })
  data: AdminGarageDetailDto;
}
