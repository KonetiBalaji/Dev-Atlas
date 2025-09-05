// DevAtlas Search Service
// Created by Balaji Koneti

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmbeddingService } from '@devatlas/ai';

@Injectable()
export class SearchService {
  constructor(
    private prisma: PrismaService,
    private embeddingService: EmbeddingService,
  ) {}

  /**
   * Perform semantic search across repository embeddings
   */
  async semanticSearch(query: string, orgId: string, limit: number = 5) {
    // Generate embedding for the query
    const queryEmbedding = await this.embeddingService.generateEmbedding({
      text: query,
    });

    // Search for similar embeddings
    const results = await this.prisma.$queryRaw`
      SELECT 
        e.id,
        e.path,
        e.kind,
        e.text,
        r.name as repo_name,
        r.url as repo_url,
        1 - (e.vector <-> ${JSON.stringify(queryEmbedding.embedding)}::vector) as similarity
      FROM embeddings e
      JOIN repos r ON e."repoId" = r.id
      JOIN analyses a ON r."analysisId" = a.id
      JOIN projects p ON a."projectId" = p.id
      WHERE p."orgId" = ${orgId}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    return results;
  }
}
