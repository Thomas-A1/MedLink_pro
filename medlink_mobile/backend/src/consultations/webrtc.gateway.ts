import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/webrtc',
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebRTCGateway.name);
  private readonly rooms = new Map<string, Set<string>>(); // consultationId -> Set of userIds

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  handleConnection(client: Socket) {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.headers.authorization?.split(' ')[1] as string | undefined);

    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token`);
      client.disconnect(true);
      return;
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      client.data.userId = payload.userId || payload.sub;
      this.logger.log(`Client ${client.id} connected as user ${client.data.userId}`);
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
    // Remove from all rooms
    this.rooms.forEach((users, consultationId) => {
      users.delete(client.data.userId);
      if (users.size === 0) {
        this.rooms.delete(consultationId);
      }
    });
  }

  @SubscribeMessage('join-room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: string },
  ) {
    const { consultationId } = data;
    const userId = client.data.userId;

    if (!consultationId) {
      client.emit('error', { message: 'Consultation ID is required' });
      return;
    }

    // Join Socket.IO room
    client.join(consultationId);

    // Track users in consultation
    if (!this.rooms.has(consultationId)) {
      this.rooms.set(consultationId, new Set());
    }
    this.rooms.get(consultationId)!.add(userId);

    this.logger.log(`User ${userId} joined consultation room ${consultationId}`);
    client.emit('joined-room', { consultationId });

    // Notify other users in the room
    client.to(consultationId).emit('user-joined', { userId });
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: string; offer: any; to: string },
  ) {
    const { consultationId, offer, to } = data;
    this.logger.log(`Offer from ${client.data.userId} to ${to} in consultation ${consultationId}`);
    
    // Send offer to the other participant
    client.to(consultationId).emit('offer', {
      consultationId,
      offer,
      from: client.data.userId,
      to,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: string; answer: any; to: string },
  ) {
    const { consultationId, answer, to } = data;
    this.logger.log(`Answer from ${client.data.userId} to ${to} in consultation ${consultationId}`);
    
    // Send answer to the other participant
    client.to(consultationId).emit('answer', {
      consultationId,
      answer,
      from: client.data.userId,
      to,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: string; candidate: any },
  ) {
    const { consultationId, candidate } = data;
    
    // Broadcast ICE candidate to other participants in the room
    client.to(consultationId).emit('ice-candidate', {
      consultationId,
      candidate,
      from: client.data.userId,
    });
  }

  @SubscribeMessage('end-call')
  handleEndCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { consultationId: string },
  ) {
    const { consultationId } = data;
    this.logger.log(`Call ended by ${client.data.userId} in consultation ${consultationId}`);
    
    // Notify other participants
    client.to(consultationId).emit('call-ended', {
      consultationId,
      endedBy: client.data.userId,
    });

    // Clean up room
    const users = this.rooms.get(consultationId);
    if (users) {
      users.delete(client.data.userId);
      if (users.size === 0) {
        this.rooms.delete(consultationId);
      }
    }
  }
}

