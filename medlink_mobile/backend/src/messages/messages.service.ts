import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message, MessageType } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctors/entities/doctor.entity';
import { Consultation } from '../consultations/entities/consultation.entity';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepo: Repository<Message>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(Consultation)
    private readonly consultationRepo: Repository<Consultation>,
  ) {}

  async createMessage(
    senderId: string,
    senderType: 'user' | 'doctor',
    dto: CreateMessageDto,
  ): Promise<Message> {
    const sender = senderType === 'user'
      ? await this.userRepo.findOne({ where: { id: senderId } })
      : null;
    const doctorSender = senderType === 'doctor'
      ? await this.doctorRepo.findOne({ where: { id: senderId } })
      : null;

    if (!sender && !doctorSender) {
      throw new NotFoundException('Sender not found');
    }

    let recipient: User | null = null;
    let doctorRecipient: Doctor | null = null;
    let consultation: Consultation | null = null;

    if (dto.consultationId) {
      consultation = await this.consultationRepo.findOne({
        where: { id: dto.consultationId },
        relations: ['patient', 'doctor'],
      });

      if (!consultation) {
        throw new NotFoundException('Consultation not found');
      }

      // Determine recipient based on sender
      if (senderType === 'user') {
        doctorRecipient = consultation.doctor;
      } else {
        recipient = consultation.patient;
      }
    } else if (dto.recipientId) {
      // Direct messaging
      if (senderType === 'user') {
        doctorRecipient = await this.doctorRepo.findOne({
          where: { id: dto.recipientId },
        });
        if (!doctorRecipient) {
          throw new NotFoundException('Doctor recipient not found');
        }
      } else {
        recipient = await this.userRepo.findOne({
          where: { id: dto.recipientId },
        });
        if (!recipient) {
          throw new NotFoundException('User recipient not found');
        }
      }
    } else {
      throw new BadRequestException('Either consultationId or recipientId must be provided');
    }

    const message = this.messageRepo.create({
      sender: sender || undefined,
      doctorSender: doctorSender || undefined,
      recipient: recipient || undefined,
      doctorRecipient: doctorRecipient || undefined,
      consultation: consultation || undefined,
      type: dto.type || MessageType.TEXT,
      content: dto.content,
      isRead: false,
    });

    return await this.messageRepo.save(message);
  }

  async getConversation(
    userId: string,
    userType: 'user' | 'doctor',
    otherId: string,
    consultationId?: string,
    limit = 50,
    offset = 0,
  ) {
    const queryBuilder = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.doctorSender', 'doctorSender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('message.doctorRecipient', 'doctorRecipient')
      .orderBy('message.createdAt', 'ASC')
      .take(limit)
      .skip(offset);

    if (consultationId) {
      queryBuilder.where('message.consultation.id = :consultationId', {
        consultationId,
      });
    } else {
      if (userType === 'user') {
        queryBuilder.where(
          '(message.sender.id = :userId OR message.recipient.id = :userId) AND (message.doctorRecipient.id = :otherId OR message.doctorSender.id = :otherId)',
          { userId, otherId },
        );
      } else {
        queryBuilder.where(
          '(message.doctorSender.id = :userId OR message.doctorRecipient.id = :userId) AND (message.sender.id = :otherId OR message.recipient.id = :otherId)',
          { userId, otherId },
        );
      }
    }

    const [messages, total] = await queryBuilder.getManyAndCount();

    return {
      messages: messages.map((m) => ({
        id: m.id,
        content: m.content,
        type: m.type,
        senderId: m.sender?.id || m.doctorSender?.id,
        senderName: m.sender
          ? `${m.sender.firstName ?? ''} ${m.sender.lastName ?? ''}`.trim()
          : m.doctorSender?.name || 'Unknown',
        senderType: m.sender ? 'user' : 'doctor',
        recipientId: m.recipient?.id || m.doctorRecipient?.id,
        createdAt: m.createdAt,
        isRead: m.isRead,
        readAt: m.readAt,
      })),
      total,
      limit,
      offset,
    };
  }

  async markAsRead(messageId: string, userId: string, userType: 'user' | 'doctor') {
    const message = await this.messageRepo.findOne({
      where: { id: messageId },
      relations: ['recipient', 'doctorRecipient'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the recipient
    const isRecipient =
      (userType === 'user' && message.recipient?.id === userId) ||
      (userType === 'doctor' && message.doctorRecipient?.id === userId);

    if (!isRecipient) {
      throw new BadRequestException('Not authorized to mark this message as read');
    }

    message.isRead = true;
    message.readAt = new Date();
    return await this.messageRepo.save(message);
  }

  async getConversations(userId: string, userType: 'user' | 'doctor') {
    // Get all unique conversations for this user
    const queryBuilder = this.messageRepo
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .leftJoinAndSelect('message.doctorSender', 'doctorSender')
      .leftJoinAndSelect('message.recipient', 'recipient')
      .leftJoinAndSelect('message.doctorRecipient', 'doctorRecipient')
      .leftJoinAndSelect('message.consultation', 'consultation');

    if (userType === 'user') {
      queryBuilder.where(
        'message.sender.id = :userId OR message.recipient.id = :userId',
        { userId },
      );
    } else {
      queryBuilder.where(
        'message.doctorSender.id = :userId OR message.doctorRecipient.id = :userId',
        { userId },
      );
    }

    const messages = await queryBuilder
      .orderBy('message.createdAt', 'DESC')
      .getMany();

    // Group by conversation partner
    const conversations = new Map<string, any>();

    for (const message of messages) {
      let partnerId: string;
      let partnerName: string;
      let partnerType: 'user' | 'doctor';

      if (userType === 'user') {
        if (message.sender?.id === userId) {
          partnerId = message.doctorRecipient?.id || '';
          partnerName = message.doctorRecipient?.name || 'Unknown';
          partnerType = 'doctor';
        } else {
          partnerId = message.doctorSender?.id || '';
          partnerName = message.doctorSender?.name || 'Unknown';
          partnerType = 'doctor';
        }
      } else {
        if (message.doctorSender?.id === userId) {
          partnerId = message.recipient?.id || '';
          partnerName = `${message.recipient?.firstName ?? ''} ${message.recipient?.lastName ?? ''}`.trim() || 'Unknown';
          partnerType = 'user';
        } else {
          partnerId = message.sender?.id || '';
          partnerName = `${message.sender?.firstName ?? ''} ${message.sender?.lastName ?? ''}`.trim() || 'Unknown';
          partnerType = 'user';
        }
      }

      const key = `${partnerType}:${partnerId}`;
      if (!conversations.has(key) || conversations.get(key).lastMessage.createdAt < message.createdAt) {
        conversations.set(key, {
          partnerId,
          partnerName,
          partnerType,
          lastMessage: {
            content: message.content,
            createdAt: message.createdAt,
            isRead: message.isRead,
          },
          unreadCount: 0, // TODO: Calculate unread count
        });
      }
    }

    return Array.from(conversations.values());
  }
}

