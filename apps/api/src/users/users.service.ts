import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { 
    email: string; 
    name?: string; 
    orgId: string; 
    role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
    provider?: string;
  }) {
    return this.prisma.user.create({
      data: {
        ...data,
        role: data.role || 'VIEWER',
        provider: data.provider || 'github',
      },
    });
  }

  async findAll() {
    return this.prisma.user.findMany({
      include: {
        org: true,
      },
    });
  }

  async findByOrg(orgId: string) {
    return this.prisma.user.findMany({
      where: { orgId },
      include: {
        org: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        org: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      include: {
        org: true,
      },
    });
  }

  async update(id: string, data: { 
    name?: string; 
    role?: 'OWNER' | 'ADMIN' | 'EDITOR' | 'VIEWER';
  }) {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
