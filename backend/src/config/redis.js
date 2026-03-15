const Redis = require('ioredis');
require('dotenv').config();
// 1. Shared Configuration Object
const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // CRITICAL: Fixes the BullMQ Deprecation warning
};

// 2. Initialize Connections
const redisClient = new Redis(redisConfig); // General use
const redisPub = new Redis(redisConfig);    // Socket.io Pub
const redisSub = new Redis(redisConfig);    // Socket.io Sub

// 3. Export everything clearly
module.exports = { 
  redisClient, 
  redisPub, 
  redisSub, 
  redisConfig 
};