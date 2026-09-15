import express from 'express';
import pg from 'pg';

const { Pool } = pg;
const app = express();
const port = Number(process.env.PORT || 3000);
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

app.get('/healthz', async (_req, res) => {
  try {
    await pool.query('select 1');
    res.json({ ok: true, service: 'zorqemi-api', database: 'ok' });
  } catch {
    res.status(503).json({ ok: false, service: 'zorqemi-api', database: 'unavailable' });
  }
});

app.get('/api/v1/status', (_req, res) => {
  res.json({ ok: true, version: '1.0', migration: 'in-progress' });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`Zorqemi API listening on ${port}`);
});
