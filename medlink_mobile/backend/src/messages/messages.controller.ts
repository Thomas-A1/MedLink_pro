import { Body, Controller, Get, Param, Post, Query, UseGuards, Patch } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  async createMessage(
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: User,
  ) {
    const senderType = user.role === UserRole.DOCTOR ? 'doctor' : 'user';
    const message = await this.messagesService.createMessage(
      user.id,
      senderType,
      dto,
    );

    return {
      data: {
        id: message.id,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt,
      },
    };
  }

  @Get('conversations')
  async getConversations(@CurrentUser() user: User) {
    const senderType = user.role === UserRole.DOCTOR ? 'doctor' : 'user';
    const conversations = await this.messagesService.getConversations(
      user.id,
      senderType,
    );
    return { data: conversations };
  }

  @Get('conversations/:otherId')
  async getConversation(
    @Param('otherId') otherId: string,
    @Query('consultationId') consultationId: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('offset') offset: string | undefined,
    @CurrentUser() user: User,
  ) {
    const senderType = user.role === UserRole.DOCTOR ? 'doctor' : 'user';
    const conversation = await this.messagesService.getConversation(
      user.id,
      senderType,
      otherId,
      consultationId,
      limit ? parseInt(limit, 10) : 50,
      offset ? parseInt(offset, 10) : 0,
    );
    return { data: conversation };
  }

  @Patch(':id/read')
  async markAsRead(
    @Param('id') messageId: string,
    @CurrentUser() user: User,
  ) {
    const senderType = user.role === UserRole.DOCTOR ? 'doctor' : 'user';
    await this.messagesService.markAsRead(messageId, user.id, senderType);
    return { success: true };
  }
}

