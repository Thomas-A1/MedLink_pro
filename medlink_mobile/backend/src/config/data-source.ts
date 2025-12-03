import 'dotenv/config';
import { DataSource } from 'typeorm';
import { join } from 'path';

const dataSource = new DataSource({
  type: 'postgres',
  url:
    process.env.DATABASE_URL ??
    'postgres://medlink:medlink@127.0.0.1:5445/medlink_mobile',
  entities: [join(__dirname, '../**/*.entity{.ts,.js}')],
  migrations: [join(__dirname, '../migrations/*{.ts,.js}')],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  ssl: false, // Disable SSL for local Docker setup
});

export default dataSource;

