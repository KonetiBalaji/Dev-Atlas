// DevAtlas Database Package
// Created by Balaji Koneti

export { PrismaClient } from '@prisma/client';
export * from '@prisma/client';

// Re-export PrismaService for convenience
export { PrismaService } from './prisma.service';

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
} from '@prisma/client';

// Re-export enums as values
export { Role } from '@prisma/client';
