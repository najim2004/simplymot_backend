import { Global, Module } from '@nestjs/common';
import { AbilityFactory } from './ability.factory';
import { AbilitiesGuard } from './abilities.guard';

@Global()
@Module({
  providers: [AbilityFactory, AbilitiesGuard],
  exports: [AbilityFactory, AbilitiesGuard],
})
export class AbilityModule {}
