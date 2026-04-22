import express from 'express';
import cors from 'cors';
import { config } from './config';
import { testDatabaseConnection, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

// ─── Middleware ───────────────────────────────────────────────
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ──────────────────────────────────────────────────
app.use('/api', routes);

// ─── Root ────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({
    name: 'AI Document Reader API',
    version: '1.0.0',
    docs: '/api/health',
  });
});

// ─── Error Handler (must be last) ────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
async function startServer() {
  // Test database connection
  const dbConnected = await testDatabaseConnection();
  if (!dbConnected) {
    console.error('💥 Failed to connect to database. Exiting...');
    process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════╗
║   🚀 AI Document Reader API                 ║
║   Running on: http://localhost:${config.port}        ║
║   Environment: ${config.nodeEnv.padEnd(28)}║
║   Database: Supabase PostgreSQL (connected)  ║
╚══════════════════════════════════════════════╝
    `);
  });
}

// ─── Graceful Shutdown ───────────────────────────────────────
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await disconnectDatabase();
  process.exit(0);
});

startServer().catch((err) => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});

export default app;
