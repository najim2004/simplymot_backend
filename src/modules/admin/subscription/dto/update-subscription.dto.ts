import { OmitType, PartialType, PickType } from '@nestjs/swagger';
import {
  CreateSubscriptionDto,
  CreateSubscriptionPlanDto,
} from './create-subscription.dto';

export class UpdateSubscriptionDto extends PartialType(CreateSubscriptionDto) {}

export class UpdateSubscriptionPlanDto extends PartialType(
  PickType(CreateSubscriptionPlanDto, ['name', 'description', 'status']),
) {}
