import { Global, Module } from '@nestjs/common';
import { WebsocketGateway } from './websocket.gateway';
import { SheetService } from 'src/workspace/services/sheet.service';
import { WorkspaceModule } from 'src/workspace/workspace.module';
// import { SheetService } from 'src/workspace/services/sheet.service';
// import { WorkspaceModule } from 'src/workspace/workspace.module';

@Global()
@Module({
  imports: [
    WorkspaceModule
    // SheetService
  ],
  providers: [WebsocketGateway],
  exports: [WebsocketGateway],
})
export class GatewayModule {}
