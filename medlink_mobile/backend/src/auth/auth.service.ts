import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { PatientProfile } from '../users/entities/patient-profile.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { RefreshDto } from './dto/refresh.dto';
import { TokenPayload } from './interfaces/token-payload.interface';
import { SmsService } from '../common/services/sms.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(PatientProfile) private readonly patientProfileRepo: Repository<PatientProfile>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly smsService: SmsService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedPhone = dto.phoneNumber.trim();
    const normalizedEmail = dto.email?.trim().toLowerCase() ?? null;

    const existing = await this.userRepo.findOne({
      where: [
        { phoneNumber: normalizedPhone },
        ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
      ],
    });

    if (existing) {
      throw new ConflictException('An account already exists for the provided email or phone number.');
    }

    if (![UserRole.PATIENT, UserRole.DOCTOR].includes(dto.role)) {
      throw new BadRequestException('Selected role is not supported yet on mobile.');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10); // Valid for 10 minutes

    const user = this.userRepo.create({
      phoneNumber: normalizedPhone,
      email: normalizedEmail,
      passwordHash,
      role: dto.role,
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      languagePreference: dto.language ?? 'en',
      otpCode,
      otpExpiresAt,
      phoneVerified: false,
    });

    await this.userRepo.save(user);

    if (dto.role === UserRole.PATIENT) {
      const profile = this.patientProfileRepo.create({
        user,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        region: dto.region,
        district: dto.district,
      });
      await this.patientProfileRepo.save(profile);
    }

    // Send OTP via SMS immediately
    const language = (dto.language ?? 'en') as 'en' | 'tw';
    try {
      await this.smsService.sendOTP(normalizedPhone, otpCode, language);
    } catch (error) {
      // Log error but don't fail registration
      console.error('Failed to send SMS:', error);
    }

    return {
      userId: user.id,
      phoneNumber: normalizedPhone,
      otpSent: true,
      message: 'Registration successful. Please verify your phone number with the code sent via SMS.',
    };
  }

  async verifyOtp(phoneNumber: string, otpCode: string) {
    const user = await this.userRepo.findOne({
      where: { phoneNumber: phoneNumber.trim() },
      relations: ['organization', 'patientProfile'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.otpCode || user.otpCode !== otpCode) {
      throw new UnauthorizedException('Invalid OTP code');
    }

    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException('OTP code has expired');
    }

    // Verify phone and clear OTP
    user.phoneVerified = true;
    user.otpCode = null;
    user.otpExpiresAt = null;
    await this.userRepo.save(user);

    return this.buildAuthResponse(user.id, true);
  }

  async resendOtp(phoneNumber: string) {
    const user = await this.userRepo.findOne({
      where: { phoneNumber: phoneNumber.trim() },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Generate new OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    user.otpCode = otpCode;
    user.otpExpiresAt = otpExpiresAt;
    await this.userRepo.save(user);

    // Send OTP via SMS immediately
    const language = (user.languagePreference ?? 'en') as 'en' | 'tw';
    try {
      await this.smsService.sendOTP(user.phoneNumber, otpCode, language);
    } catch (error) {
      // Log error but don't fail resend
      console.error('Failed to send SMS:', error);
    }

    return {
      message: 'OTP code has been resent to your phone number',
      otpSent: true,
    };
  }

  async login(dto: LoginDto) {
    const identifier = dto.identifier.trim().toLowerCase();
    const user = await this.userRepo.findOne({
      where: [{ phoneNumber: identifier }, { email: identifier }],
      relations: ['organization', 'patientProfile'],
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.buildAuthResponse(user.id, true);
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization', 'patientProfile'],
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return this.serializeUser(user);
  }

  async refresh(dto: RefreshDto) {
    try {
      const decoded = await this.jwtService.verifyAsync<TokenPayload>(dto.refreshToken, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
      const user = await this.userRepo.findOne({
        where: { id: decoded.sub },
        relations: ['organization', 'patientProfile'],
      });
      if (!user) {
        throw new UnauthorizedException();
      }
      return this.buildAuthResponse(user.id, false);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async buildAuthResponse(userId: string, includeRefreshToken = false) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ['organization', 'patientProfile'],
    });
    if (!user) {
      throw new UnauthorizedException();
    }

    const payload: TokenPayload = {
      sub: user.id,
      role: user.role,
      phoneNumber: user.phoneNumber,
      organizationId: user.organization?.id ?? null,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get<string>('JWT_ACCESS_EXPIRES_IN', '15m'),
    } as any);

    let refreshToken: string | null = null;
    if (includeRefreshToken) {
      refreshToken = await this.jwtService.signAsync(payload, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d'),
      } as any);
    }

    return {
      accessToken,
      refreshToken,
      user: this.serializeUser(user),
    };
  }

  private serializeUser(user: User) {
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      phoneNumber: user.phoneNumber,
      firstName: user.firstName,
      lastName: user.lastName,
      profilePhotoUrl: user.profilePhotoUrl,
      organizationId: user.organization?.id,
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            type: user.organization.type,
            region: user.organization.region,
            district: user.organization.district,
            externalDesktopOrgId: user.organization.externalDesktopOrgId,
          }
        : null,
      isActive: user.isActive,
    };
  }
}

