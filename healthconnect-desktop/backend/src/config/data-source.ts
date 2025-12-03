import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const databaseUrl = process.env.DATABASE_URL || 'postgres://hc:hcpassword@127.0.0.1:5434/healthconnect_desktop';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  url: databaseUrl,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: false,
  migrationsRun: false,
};

const dataSource = new DataSource(dataSourceOptions);
export default dataSource;
