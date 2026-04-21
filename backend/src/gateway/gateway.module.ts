import { Module } from '@nestjs/common';
import { FbEventsGateway } from './fb-events.gateway';

@Module({
  providers: [FbEventsGateway],
  exports: [FbEventsGateway],
})
export class GatewayModule {}
