import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  namespace: '/queue',
  cors: {
    origin: '*',
  },
})
export class QueueGateway {
  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly jwtService: JwtService, private readonly configService: ConfigService) {}

  handleConnection(socket: Socket) {
    const token =
      (socket.handshake.auth?.token as string | undefined) ??
      (socket.handshake.headers.authorization?.split(' ')[1] as string | undefined);

    if (!token) {
      socket.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('auth.accessSecret'),
      });
      socket.data.user = payload;
    } catch {
      socket.disconnect(true);
    }
  }

  handleDisconnect(socket: Socket) {
    if (socket.data.room) {
      socket.leave(socket.data.room);
    }
  }

  @SubscribeMessage('queue.subscribe')
  handleSubscribe(@MessageBody() data: { pharmacyId?: string }, @ConnectedSocket() socket: Socket) {
    if (!data?.pharmacyId) {
      return;
    }
    if (socket.data.room) {
      socket.leave(socket.data.room);
    }
    socket.join(data.pharmacyId);
    socket.data.room = data.pharmacyId;
  }

  emitQueueUpdate(pharmacyId: string, payload: unknown) {
    if (!this.server) {
      return;
    }
    this.server.to(pharmacyId).emit('queue.updated', payload);
  }
}

