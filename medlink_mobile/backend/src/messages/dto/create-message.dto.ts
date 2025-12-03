import { IsString, IsOptional, IsEnum } from 'class-validator';
import { MessageType } from '../entities/message.entity';

export class CreateMessageDto {
  @IsString()
  content: string;

  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @IsString()
  @IsOptional()
  recipientId?: string; // For patient-to-doctor or doctor-to-patient

  @IsString()
  @IsOptional()
  consultationId?: string;
}

