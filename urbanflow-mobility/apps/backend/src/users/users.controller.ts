import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload, UserProfile } from '@urbanflow/types';

interface RequestWithJwt extends Request {
  user: JwtPayload;
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  async getProfile(@Request() req: RequestWithJwt): Promise<UserProfile> {
    return this.usersService.getProfile(req.user.sub);
  }

  @Put('profile')
  async updateProfile(
    @Request() req: RequestWithJwt,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfile> {
    return this.usersService.updateProfile(req.user.sub, dto);
  }
}
