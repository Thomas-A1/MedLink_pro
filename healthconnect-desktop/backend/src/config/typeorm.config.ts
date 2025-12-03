import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const typeOrmModuleOptions = (configService: ConfigService): TypeOrmModuleOptions => ({
  type: 'postgres',
  url: configService.get<string>('DATABASE_URL') ?? process.env.DATABASE_URL,
  autoLoadEntities: true,
  synchronize: false,
  migrationsRun: true,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
});
