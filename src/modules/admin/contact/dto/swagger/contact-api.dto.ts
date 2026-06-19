import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageSuccessDto } from 'src/common/swagger/dto/api-response.dto';

export class AdminContactRecordDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional({ nullable: true })
  first_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  last_name: string | null;

  @ApiPropertyOptional({ nullable: true })
  email: string | null;

  @ApiPropertyOptional({ nullable: true })
  phone_number: string | null;

  @ApiPropertyOptional({ nullable: true })
  message: string | null;
}

export class CreateAdminContactResponseDto extends MessageSuccessDto {
  @ApiProperty({ example: 'Contact created successfully' })
  message: string;
}

export class ListAdminContactsResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: [AdminContactRecordDto] })
  data: AdminContactRecordDto[];
}

export class GetAdminContactResponseDto {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ type: AdminContactRecordDto })
  data: AdminContactRecordDto;
}

export class UpdateAdminContactResponseDto extends MessageSuccessDto {
  @ApiProperty({ example: 'Contact updated successfully' })
  message: string;
}

export class DeleteAdminContactResponseDto extends MessageSuccessDto {
  @ApiProperty({ example: 'Contact deleted successfully' })
  message: string;
}
