import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; stripeId?: string }) {
    return this.prisma.org.create({
      data,
    });
  }

  async findAll() {
    return this.prisma.org.findMany({
      include: {
        users: true,
        projects: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.org.findUnique({
      where: { id },
      include: {
        users: true,
        projects: true,
      },
    });
  }

  async update(id: string, data: { name?: string; stripeId?: string }) {
    return this.prisma.org.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.org.delete({
      where: { id },
    });
  }
}
