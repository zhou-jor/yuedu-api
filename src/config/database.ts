import mongoose from 'mongoose';
import Redis from 'ioredis';
import { config } from './index';

export const connectMongo = async (): Promise<void> => {
  try {
    await mongoose.connect(config.mongo.uri);
    console.log(`[MongoDB] Connected to ${config.mongo.uri}`);
  } catch (error) {
    console.error('[MongoDB] Connection failed:', error);
    process.exit(1);
  }
  
  mongoose.connection.on('error', (err) => {
    console.error('[MongoDB] Error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected');
  });
};

let redisClient: Redis | null = null;

export const connectRedis = (): Redis => {
  if (redisClient) return redisClient;
  
  redisClient = new Redis({
    host: config.redis.host,
    port: config.redis.port,
    retryStrategy: (times) => Math.min(times * 200, 5000),
  });
  
  redisClient.on('connect', () => {
    console.log(`[Redis] Connected to ${config.redis.host}:${config.redis.port}`);
  });
  
  redisClient.on('error', (err) => {
    console.error('[Redis] Error:', err);
  });
  
  return redisClient;
};

export const getRedis = (): Redis => {
  if (!redisClient) {
    return connectRedis();
  }
  return redisClient;
};
