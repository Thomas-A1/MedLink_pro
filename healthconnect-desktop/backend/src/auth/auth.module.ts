import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../common/entities/user.entity';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PasswordToken } from './entities/password-token.entity';
import { PasswordTokensService } from './password-tokens.service';
import { ActivityModule } from '../activity/activity.module';
import { SmsModule } from '../common/services/sms.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, PasswordToken]),
    PassportModule,
    ActivityModule,
    SmsModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('auth.accessSecret'),
        signOptions: { expiresIn: '60m' },
      }),
    }),
  ],
  providers: [AuthService, JwtAccessStrategy, JwtRefreshStrategy, PasswordTokensService],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PasswordTokensService],
})
export class AuthModule {}
