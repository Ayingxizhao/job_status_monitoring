require('dotenv').config();

module.exports = {
  development: {
    client: process.env.DB_TYPE || 'postgresql',
    connection: getConnectionConfig(),
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  test: {
    client: 'postgresql',
    connection: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      database: process.env.TEST_DB_NAME || 'job_status_test',
      ssl: false
    },
    migrations: {
      directory: './src/migrations'
    },
    seeds: {
      directory: './src/seeds'
    }
  },

  production: {
    client: process.env.DB_TYPE || 'postgresql',
    connection: getConnectionConfig(),
    migrations: {
      directory: './src/migrations'
    },
    pool: {
      min: 2,
      max: 10
    }
  }
};

function getConnectionConfig() {
  const dbType = process.env.DB_TYPE || 'postgresql';
  
  switch (dbType) {
    case 'postgresql':
      return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'job_status',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
    
    case 'mysql':
      return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'job_status'
      };
    
    default:
      return {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'job_status',
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
      };
  }
}
