// DevAtlas Database Package
// Created by Balaji Koneti

export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

// Re-export types for convenience
export type {
  Org,
  User,
  Project,
  Analysis,
  Repo,
  Ownership,
  Score,
  Embedding,
  Job,
  AuditLog,
  Role,
} from '@prisma/client';
