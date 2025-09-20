import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReposService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnership(repoId: string) {
    return this.prisma.ownership.findMany({
      where: { repoId },
      orderBy: { share: 'desc' },
    });
  }
}
