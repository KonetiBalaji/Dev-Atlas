// DevAtlas Auth Service
// Created by Balaji Koneti

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@devatlas/db';

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  orgId: string;
  role: Role;
}

export interface AuthResult {
  access_token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    orgId: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /**
   * Validate user credentials
   */
  async validateUser(email: string, password: string): Promise<any> {
    // In a real implementation, you'd hash and compare passwords
    // For now, we'll use a simple check for demo purposes
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { org: true },
    });

    if (user && password === 'changeme') { // Demo password
      const { ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Login user and return JWT token
   */
  async login(user: any): Promise<AuthResult> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      orgId: user.orgId,
      role: user.role,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        orgId: user.orgId,
      },
    };
  }

  /**
   * Validate JWT token and return user
   */
  async validateJwtPayload(payload: JwtPayload): Promise<any> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { org: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Create or update user from GitHub OAuth
   */
  async createOrUpdateFromGithub(githubUser: any, orgId: string): Promise<AuthResult> {
    const user = await this.prisma.user.upsert({
      where: { email: githubUser.email },
      update: {
        name: githubUser.name || githubUser.login,
        provider: 'github',
      },
      create: {
        email: githubUser.email,
        name: githubUser.name || githubUser.login,
        orgId,
        role: Role.VIEWER, // Default role for new users
        provider: 'github',
      },
      include: { org: true },
    });

    return this.login(user);
  }

  /**
   * Check if user has required role
   */
  hasRole(userRole: Role, requiredRole: Role): boolean {
    const roleHierarchy = {
      [Role.VIEWER]: 0,
      [Role.EDITOR]: 1,
      [Role.ADMIN]: 2,
      [Role.OWNER]: 3,
    };

    return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
  }
}
