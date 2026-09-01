import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { CreateFavoriteAddressDto } from './dto/create-favorite-address.dto';
import { UpdateFavoriteAddressDto } from './dto/update-favorite-address.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { FavoriteAddress, JwtPayload } from '@urbanflow/types';

interface RequestWithJwt extends Request {
  user: JwtPayload;
}

@Controller('favorite-addresses')
@UseGuards(JwtAuthGuard)
export class FavoriteAddressesController {
  constructor(private readonly favoriteAddresses: FavoriteAddressesService) {}

  @Get()
  async list(@Request() req: RequestWithJwt): Promise<FavoriteAddress[]> {
    return this.favoriteAddresses.list(req.user.sub);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: RequestWithJwt,
    @Body() dto: CreateFavoriteAddressDto,
  ): Promise<FavoriteAddress> {
    return this.favoriteAddresses.create(req.user.sub, dto);
  }

  @Patch(':id')
  async update(
    @Request() req: RequestWithJwt,
    @Param('id') id: string,
    @Body() dto: UpdateFavoriteAddressDto,
  ): Promise<FavoriteAddress> {
    return this.favoriteAddresses.update(req.user.sub, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Request() req: RequestWithJwt, @Param('id') id: string): Promise<void> {
    return this.favoriteAddresses.remove(req.user.sub, id);
  }
}
