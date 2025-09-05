// DevAtlas Worker Main Entry Point
// Created by Balaji Koneti

import { Worker } from 'bullmq';
import { PrismaClient } from '@devatlas/db';
import { AnalysisProcessor } from './processors/analysis.processor';
import { logger } from './utils/logger';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting DevAtlas Worker...');

  // Create Redis connection
  const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
  };

  // Create analysis processor
  const analysisProcessor = new AnalysisProcessor(prisma);

  // Create worker for analysis jobs
  const analysisWorker = new Worker(
    'analysis',
    async (job) => {
      logger.info(`Processing analysis job: ${job.id}`, { jobData: job.data });
      
      try {
        switch (job.name) {
          case 'analyze-project':
            await analysisProcessor.analyzeProject(job.data);
            break;
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      } catch (error) {
        logger.error(`Job ${job.id} failed:`, error);
        throw error;
      }
    },
    {
      connection,
      concurrency: parseInt(process.env.MAX_PARALLEL_CLONES || '3'),
    },
  );

  // Handle worker events
  analysisWorker.on('completed', (job) => {
    logger.info(`Job ${job.id} completed successfully`);
  });

  analysisWorker.on('failed', (job, err) => {
    logger.error(`Job ${job?.id} failed:`, err);
  });

  analysisWorker.on('error', (err) => {
    logger.error('Worker error:', err);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down worker...');
    await analysisWorker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down worker...');
    await analysisWorker.close();
    await prisma.$disconnect();
    process.exit(0);
  });

  console.log('✅ DevAtlas Worker started successfully');
}

main().catch((error) => {
  console.error('❌ Failed to start worker:', error);
  process.exit(1);
});
