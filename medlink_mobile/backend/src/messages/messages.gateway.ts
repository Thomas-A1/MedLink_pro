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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Consultation } from '../consultations/entities/consultation.entity';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/messages',
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      const userId = payload.sub;
      const userRole = payload.role;

      // Update online status
      if (userRole === UserRole.DOCTOR) {
        await this.doctorRepo.update(userId, {
          isOnline: true,
          lastSeenAt: new Date(),
        });
      } else {
        await this.userRepo.update(userId, {
          isOnline: true,
          lastSeenAt: new Date(),
        });
      }

      client.data.userId = userId;
      client.data.userRole = userRole;

      // Join user's personal room
      client.join(`user:${userId}`);
    } catch (error) {
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data.userId;
    const userRole = client.data.userRole;

    if (userId) {
      // Update offline status
      if (userRole === UserRole.DOCTOR) {
        await this.doctorRepo.update(userId, {
          isOnline: false,
          lastSeenAt: new Date(),
        });
      } else {
        await this.userRepo.update(userId, {
          isOnline: false,
          lastSeenAt: new Date(),
        });
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @MessageBody() dto: CreateMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const userId = client.data.userId;
    const userRole = client.data.userRole;
    const senderType = userRole === UserRole.DOCTOR ? 'doctor' : 'user';

    const message = await this.messagesService.createMessage(userId, senderType, dto);

    // Determine recipient room
    let recipientRoom: string;
    if (dto.consultationId) {
      // Get consultation to find recipient
      const consultation = await this.consultationRepo.findOne({
        where: { id: dto.consultationId },
        relations: ['patient', 'doctor'],
      });

      if (senderType === 'user') {
        recipientRoom = `user:${consultation?.doctor.id}`;
      } else {
        recipientRoom = `user:${consultation?.patient.id}`;
      }
    } else if (dto.recipientId) {
      recipientRoom = `user:${dto.recipientId}`;
    } else {
      return { error: 'No recipient specified' };
    }

    // Emit to recipient
    this.server.to(recipientRoom).emit('new_message', {
      id: message.id,
      content: message.content,
      type: message.type,
      senderId: userId,
      senderType,
      createdAt: message.createdAt,
    });

    // Also emit to sender for confirmation
    client.emit('message_sent', {
      id: message.id,
      content: message.content,
      createdAt: message.createdAt,
    });

    return { success: true, messageId: message.id };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { recipientId: string; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const recipientRoom = `user:${data.recipientId}`;
    this.server.to(recipientRoom).emit('user_typing', {
      userId: client.data.userId,
      isTyping: data.isTyping,
    });
  }
}

