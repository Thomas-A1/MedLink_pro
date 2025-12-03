import { QueueStatus } from '../entities/queue-entry.entity';

export interface QueueEntryResponse {
  id: string;
  status: QueueStatus;
  priority: number;
  createdAt: Date;
  acknowledgedAt?: Date;
  completedAt?: Date;
  waitTimeMinutes: number;
  patient: {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
  };
}

