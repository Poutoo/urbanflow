import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { RefreshDto } from './dto/refresh.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthGuard } from './guards/local-auth.guard';
import type { AuthResponse, AuthUser, JwtPayload } from '@urbanflow/types';

type RequestWithUser = ExpressRequest & { user: AuthUser };
type RequestWithJwt = ExpressRequest & { user: JwtPayload };

@Controller('auth')
@Throttle({ auth: { ttl: 60_000, limit: 10 } })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterDto, @Req() req: ExpressRequest): Promise<AuthResponse> {
    const userAgent = req.headers['user-agent'];
    return this.authService.register(dto, userAgent, req.ip);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  async login(@Req() req: RequestWithUser): Promise<AuthResponse> {
    const userAgent = req.headers['user-agent'];
    return this.authService.login(req.user, userAgent, req.ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshDto): Promise<AuthResponse> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshDto): Promise<void> {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req: RequestWithJwt): Promise<AuthUser> {
    return this.authService.getMe(req.user.sub);
  }
}
