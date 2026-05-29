import http from 'http';
import app from './app';
import { config } from './config';
import { connectMongo, connectRedis } from './config/database';
import { initSocket } from './socket';

const start = async () => {
  await connectMongo();
  connectRedis();

  const server = http.createServer(app);
  initSocket(server);

  server.listen(config.port, () => {
    console.log(`[Server] ${config.app.name} API running on port ${config.port}`);
    console.log(`[Server] Environment: ${config.env}`);
  });
};

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
