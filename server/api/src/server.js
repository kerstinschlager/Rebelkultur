import express from 'express';
import pg from 'pg';
import { migrate } from './migrate.js';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000
});

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', async (_req, res) => {
  try {
    const result = await pool.query('select current_timestamp as now');
    res.json({ ok: true, service: 'zorqemi-api', database: 'ok', time: result.rows[0].now });
  } catch (error) {
    console.error('healthz database error', error);
    res.status(503).json({ ok: false, service: 'zorqemi-api', database: 'unavailable' });
  }
});

app.get('/api/v1/status', async (_req, res) => {
  try {
    const result = await pool.query(
      'select version from schema_migrations order by version desc limit 1'
    );
    res.json({
      ok: true,
      version: '0.1.0',
      migration: result.rows[0]?.version ?? null,
      database: 'postgresql'
    });
  } catch (error) {
    console.error('status database error', error);
    res.status(503).json({ ok: false, version: '0.1.0', migration: 'database-unavailable' });
  }
});

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'not_found' });
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ ok: false, error: 'internal_server_error' });
});

const server = app.listen(port, '0.0.0.0', () => {
  console.log(`Zorqemi API listening on ${port}`);
});

try {
  await migrate(pool);
} catch (error) {
  console.error('Database migration failed:', error);
  server.close();
  await pool.end();
  process.exit(1);
}

const shutdown = async (signal) => {
  console.log(`Received ${signal}, shutting down`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
