import type { Knex } from 'knex';
interface DbConfig {
    test: Knex.Config;
    development: Knex.Config;
    production: Knex.Config;
}
declare const config: DbConfig;
export default config;
//# sourceMappingURL=knexfile.d.ts.map