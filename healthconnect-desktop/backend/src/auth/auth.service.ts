import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { User } from '../common/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { UserRole } from '../common/enums/role.enum';
import { PasswordTokensService } from './password-tokens.service';
import { PasswordTokenType } from './entities/password-token.entity';
import { ActivityService } from '../activity/activity.service';
import { ActivityResourceType } from '../activity/entities/activity-log.entity';
import { SmsService } from '../common/services/sms.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly passwordTokensService: PasswordTokensService,
    private readonly activityService: ActivityService,
    private readonly smsService: SmsService,
  ) {}

  async validateUser(credentials: LoginDto): Promise<User> {
    const identifier = (credentials.identifier ?? '').trim();
    const isEmailIdentifier = identifier.includes('@');
    const normalizedEmail = isEmailIdentifier ? identifier.toLowerCase() : identifier.toLowerCase();

    const user = await this.userRepo.findOne({
      where: isEmailIdentifier
        ? { email: normalizedEmail }
        : [{ email: normalizedEmail }, { phoneNumber: identifier }],
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account disabled');
    }

    const passwordValid = await bcrypt.compare(credentials.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  async login(credentials: LoginDto) {
    const user = await this.validateUser(credentials);
    return this.generateTokens(user);
  }

  async register(dto: RegisterDto) {
    const normalizedEmail = (dto.email ?? `${dto.phoneNumber}@patients.medlink`).toLowerCase().trim();

    const existing = await this.userRepo.findOne({
      where: [{ email: normalizedEmail }, { phoneNumber: dto.phoneNumber }],
    });

    if (existing) {
      throw new ConflictException('An account already exists with the provided email or phone number.');
    }

    if (![UserRole.DOCTOR, UserRole.PATIENT].includes(dto.role)) {
      throw new UnauthorizedException('Role not allowed for self-registration.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.userRepo.create({
      email: normalizedEmail,
      phoneNumber: dto.phoneNumber,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName,
      lastName: dto.lastName,
      languagePreference: dto.language ?? 'en',
    });

    await this.userRepo.save(user);

    await this.activityService.record({
      actor: user,
      organization: null,
      resourceType: ActivityResourceType.AUTH,
      resourceId: user.id,
      action: 'auth.register',
      metadata: {
        role: dto.role,
        source: 'mobile_app',
      },
    });

    return this.generateTokens(user);
  }

  async refreshTokens(payload: RefreshDto) {
    try {
      const decoded = await this.jwtService.verifyAsync(payload.refreshToken, {
        secret: this.configService.get<string>('auth.refreshSecret'),
      });
      const user = await this.userRepo.findOne({ where: { id: decoded.sub }, relations: ['organization'] });
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      return this.generateTokens(user);
    } catch (err) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async generateTokens(user: User) {
    let hydratedUser = user;

    if ((!hydratedUser.organization || !('settings' in hydratedUser.organization)) && hydratedUser.role !== UserRole.SUPER_ADMIN) {
      const reloaded = await this.userRepo.findOne({
        where: { id: hydratedUser.id },
        relations: ['organization', 'organization.pharmacies'],
      });
      if (reloaded) {
        hydratedUser = reloaded;
      }
    }

    const organization = hydratedUser.organization
      ? {
          id: hydratedUser.organization.id,
          name: hydratedUser.organization.name,
          type: hydratedUser.organization.type,
          brandColor: hydratedUser.organization.brandColor ?? null,
          timezone: hydratedUser.organization.timezone ?? null,
          settings: (hydratedUser.organization.settings ?? null) as Record<string, unknown> | null,
        }
      : null;

    const accessToken = await this.jwtService.signAsync(
      {
        sub: hydratedUser.id,
        role: hydratedUser.role,
        email: hydratedUser.email,
        organizationId: organization?.id ?? null,
      },
      {
        secret: this.configService.get<string>('auth.accessSecret'),
        expiresIn: '60m',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: hydratedUser.id,
      },
      {
        secret: this.configService.get<string>('auth.refreshSecret'),
        expiresIn: '14d',
      },
    );

    return {
      accessToken,
      refreshToken,
      user: {
        id: hydratedUser.id,
        email: hydratedUser.email,
        role: hydratedUser.role,
        firstName: hydratedUser.firstName,
        lastName: hydratedUser.lastName,
        organization,
      },
    };
  }

  async seedInitialAdmin() {
    const adminExists = await this.userRepo.findOne({ where: { role: UserRole.HOSPITAL_ADMIN } });
    if (adminExists) {
      await this.seedSuperAdmin();
      return;
    }

    const passwordHash = await bcrypt.hash('Admin@123', 10);
    const admin = this.userRepo.create({
      email: 'admin@healthconnect.com',
      phoneNumber: '+233200000000',
      passwordHash,
      role: UserRole.HOSPITAL_ADMIN,
      firstName: 'System',
      lastName: 'Admin',
    });
    await this.userRepo.save(admin);
    await this.seedSuperAdmin();
  }

  private async seedSuperAdmin() {
    const superAdminEmail = 'superadmin@healthconnect.com';
    const existing = await this.userRepo.findOne({ where: { email: superAdminEmail } });
    if (existing) {
      return;
    }

    const passwordHash = await bcrypt.hash('SuperAdmin@123', 10);
    const superAdmin = this.userRepo.create({
      email: superAdminEmail,
      phoneNumber: '+233999999999',
      passwordHash,
      role: UserRole.SUPER_ADMIN,
      firstName: 'Global',
      lastName: 'Admin',
    });
    await this.userRepo.save(superAdmin);
  }

  async requestPasswordReset(email: string) {
    const normalizedEmail = (email ?? '').toLowerCase().trim();
    const user = await this.userRepo.findOne({ 
      where: { email: normalizedEmail },
      relations: ['organization'],
    });
    
    // Always return the same message for security (don't reveal if account exists)
    if (!user) {
      return { message: 'If an account exists, password reset instructions have been sent.' };
    }

    // Verify user has a phone number (required for SMS reset)
    if (!user.phoneNumber) {
      throw new UnauthorizedException('Password reset via SMS requires a registered phone number. Please contact support.');
    }

    // Generate 6-digit reset code (expires in 10 minutes)
    const code = await this.passwordTokensService.createResetCode(user, 10);
    
    // Send SMS with reset code
    const smsSent = await this.smsService.sendPasswordResetCode(user.phoneNumber, code);
    
    await this.activityService.record({
      actor: user,
      organization: user.organization ?? null,
      resourceType: ActivityResourceType.AUTH,
      resourceId: user.id,
      action: 'auth.reset.request',
      metadata: { 
        email: normalizedEmail,
        phoneNumber: user.phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
        smsSent,
      },
    });

    if (!smsSent) {
      // Log error but don't reveal to user for security
      return {
        message: 'If an account exists, password reset instructions have been sent.',
        error: 'SMS delivery failed. Please check your phone number or contact support.',
      };
    }

    return {
      message: `Password reset code has been sent to the phone number registered with this account (ending in ${user.phoneNumber.slice(-4)}).`,
      phoneNumberLastFour: user.phoneNumber.slice(-4),
    };
  }

  async resetPassword(code: string, newPassword: string) {
    let result;
    try {
      result = await this.passwordTokensService.consumeResetCode(code);
    } catch (err) {
      throw new UnauthorizedException(
        err instanceof Error ? err.message : 'Reset code is invalid or expired.',
      );
    }

    const { user, token: tokenRecord } = result;

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    await this.activityService.record({
      actor: user,
      organization: user.organization ?? null,
      resourceType: ActivityResourceType.AUTH,
      resourceId: user.id,
      action: tokenRecord.type === PasswordTokenType.INVITE ? 'auth.invite.accept' : 'auth.reset.complete',
      metadata: {
        tokenType: tokenRecord.type,
        method: 'sms',
      },
    });

    return { message: 'Password has been updated successfully.' };
  }

  /**
   * Change password for authenticated user
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.userRepo.findOne({ 
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Update password
    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepo.save(user);

    await this.activityService.record({
      actor: user,
      organization: user.organization ?? null,
      resourceType: ActivityResourceType.AUTH,
      resourceId: user.id,
      action: 'auth.password.change',
      metadata: {},
    });

    return { message: 'Password has been updated successfully.' };
  }
}
