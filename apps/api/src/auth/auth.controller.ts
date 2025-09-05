// DevAtlas Auth Controller
// Created by Balaji Koneti

import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService, AuthResult } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: 'Login with email and password' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() loginDto: LoginDto): Promise<AuthResult> {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) {
      throw new Error('Invalid credentials');
    }
    return this.authService.login(user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getProfile(@Request() req) {
    return {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      role: req.user.role,
      orgId: req.user.orgId,
    };
  }

  @Post('github')
  @ApiOperation({ summary: 'Login with GitHub OAuth' })
  @ApiResponse({ status: 200, description: 'GitHub login successful' })
  async githubLogin(@Body() body: { code: string; orgId: string }): Promise<AuthResult> {
    // In a real implementation, you'd exchange the code for a GitHub token
    // and fetch user information from GitHub API
    const mockGithubUser = {
      email: 'github@example.com',
      name: 'GitHub User',
      login: 'githubuser',
    };

    return this.authService.createOrUpdateFromGithub(mockGithubUser, body.orgId);
  }
}
