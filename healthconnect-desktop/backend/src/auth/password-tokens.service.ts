import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import { PasswordToken, PasswordTokenType } from './entities/password-token.entity';
import { User } from '../common/entities/user.entity';

@Injectable()
export class PasswordTokensService {
  constructor(
    @InjectRepository(PasswordToken)
    private readonly tokenRepo: Repository<PasswordToken>,
  ) {}

  private hashToken(raw: string) {
    return createHash('sha256').update(raw).digest('hex');
  }

  async createToken(user: User, type: PasswordTokenType, ttlMinutes: number): Promise<string> {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawToken);

    await this.tokenRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId: user.id })
      .andWhere('type = :type', { type })
      .andWhere('usedAt IS NULL')
      .execute();

    const token = this.tokenRepo.create({
      user,
      type,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });
    await this.tokenRepo.save(token);
    return rawToken;
  }

  /**
   * Create a 6-digit password reset code for SMS
   */
  async createResetCode(user: User, ttlMinutes: number): Promise<string> {
    // Generate 6-digit code (000000-999999)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const tokenHash = this.hashToken(code);

    // Delete existing unused reset codes for this user
    await this.tokenRepo
      .createQueryBuilder()
      .delete()
      .where('userId = :userId', { userId: user.id })
      .andWhere('type = :type', { type: PasswordTokenType.RESET })
      .andWhere('usedAt IS NULL')
      .execute();

    const token = this.tokenRepo.create({
      user,
      type: PasswordTokenType.RESET,
      tokenHash,
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    });
    await this.tokenRepo.save(token);
    return code;
  }

  /**
   * Verify and consume a 6-digit reset code
   */
  async consumeResetCode(
    code: string,
  ): Promise<{ user: User; token: PasswordToken }> {
    const tokenHash = this.hashToken(code);
    const token = await this.tokenRepo.findOne({
      where: { tokenHash },
      relations: ['user', 'user.organization'],
    });
    if (!token) {
      throw new Error('Invalid reset code');
    }
    if (token.usedAt) {
      throw new Error('Reset code already used');
    }
    if (token.expiresAt.getTime() < Date.now()) {
      throw new Error('Reset code expired');
    }
    if (token.type !== PasswordTokenType.RESET) {
      throw new Error('Invalid code type');
    }

    token.usedAt = new Date();
    await this.tokenRepo.save(token);

    return { user: token.user, token };
  }

  async consumeToken(
    rawToken: string,
    allowedTypes: PasswordTokenType[],
  ): Promise<{ user: User; token: PasswordToken }> {
    const tokenHash = this.hashToken(rawToken);
    const token = await this.tokenRepo.findOne({
      where: { tokenHash },
      relations: ['user', 'user.organization'],
    });
    if (!token) {
      throw new Error('Invalid token');
    }
    if (token.usedAt) {
      throw new Error('Token already used');
    }
    if (token.expiresAt.getTime() < Date.now()) {
      throw new Error('Token expired');
    }
    if (!allowedTypes.includes(token.type)) {
      throw new Error('Token type mismatch');
    }

    token.usedAt = new Date();
    await this.tokenRepo.save(token);

    return { user: token.user, token };
  }
}

