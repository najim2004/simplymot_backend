import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MessageSuccessDto } from 'src/common/swagger/dto/api-response.dto';

export class CreateContactResponseDto extends MessageSuccessDto {
  @ApiProperty({ example: 'Submitted successfully' })
  message: string;
}
