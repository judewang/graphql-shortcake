import _ from 'lodash';
import pg from 'pg';
import knex from 'knex';

pg.types.setTypeParser(1082, _.identity);

export default knex({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    user: 'postgres',
    password: null,
    database: 'graphql_shortcake',
  },
});
