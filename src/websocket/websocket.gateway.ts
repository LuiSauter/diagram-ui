import { OnModuleInit } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WorkspaceEntity } from 'src/workspace/entities/workspace.entity';
// import { SheetService } from 'src/workspace/services/sheet.service';

@WebSocketGateway({
  cors: '*',
})
export class WebsocketGateway {


  // constructor(
  //   // private readonly sheetService: SheetService,
  //   // private readonly sheetService: SheetService
  // ) { }

  @WebSocketServer()
  public server: Server;

  async onModuleInit() {
    this.server.on('connect', async (socket: Socket) => {
      // const { id_user } = socket.handshake.auth;
      // try {
      //   // const notifications = await this.notificationProductService.getNotificationByUser(id_user);
      //   // this.server.emit('on-notifications', notifications);
      // } catch (error) {
      //   // this.logger.warn('Error al obtener las notificaciones:', error);
      //   this.server.emit('error', 'No se pudieron obtener las notificaciones');
      // }
    });
  }
  // private readonly workspaceService: WorkspaceService

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected:`)
    console.log(client.handshake.query.token);
    // await this.sheetService.stopSession(client.handshake.query.token.toString());
  }

  // PROJECTS
  handleNewProject(workspaceId: string, data: WorkspaceEntity) {
    console.log('Listo de proyectos: ', data);
    // this.server.emit('on-project-list', data);
    this.server.emit(`workspace/${workspaceId}`, data);
  }

  @SubscribeMessage('updateCursor')
  async handleUpdateCursor(client: Socket, data: any) {
    const { sheetId, ...res } = data

    this.server.emit(`cursor/${sheetId}`, res)
  }

  @SubscribeMessage('updateSheetParticipants')
  async handleUpdateSheetParticipants(client: Socket, data: any) {
    const { sheetId, ...res } = data

    this.server.emit(`sheet/${sheetId}`, res)
  }

}
