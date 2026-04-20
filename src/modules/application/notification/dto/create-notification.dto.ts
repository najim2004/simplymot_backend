import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsOptional()
  @IsString()
  sender_id?: string;

  @IsOptional()
  @IsString()
  receiver_id?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  entity_id?: string;
}
