import * as dotenv from 'dotenv';
import type { Knex } from 'knex';
import * as path from 'path';

dotenv.config();

const { DATABASE_PROD_URL, DATABASE_DEV_URL, DATABASE_TEST_URL } = process.env;

interface DbConfig {
  test: Knex.Config;
  development: Knex.Config;
  production: Knex.Config;
}

const config: DbConfig = {
  development: {
    client: 'postgresql',
    connection: DATABASE_DEV_URL,
    searchPath: ['public'],

    pool: {
      min: 0,
      max: 3,
      idleTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,
    },
    migrations: {
      directory: './infrastructure/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './infrastructure/database/seeds',
    },
  },

  test: {
    client: 'postgresql',
    connection: DATABASE_TEST_URL,
    pool: {
      min: 0,
      max: 3,
      idleTimeoutMillis: 5000,
      acquireTimeoutMillis: 10000,
    },
    migrations: {
      directory: './infrastructure/database/migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './infrastructure/database/seeds',
    },
  },

  production: {
    client: 'postgresql',
    connection: DATABASE_PROD_URL,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 30000,
    },
    migrations: {
      directory: path.join('./infrastructure/database/migrations'),
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: path.join('./infrastructure/database/seeds'),
    },
  },
};

export default config;
