import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { CreateFavoriteAddressDto, UpdateFavoriteAddressDto } from './dto/favorite-address.dto';
import type { JwtPayload } from '@urbanflow/types';

@Controller('favorite-addresses')
@UseGuards(JwtAuthGuard)
export class FavoriteAddressesController {
  constructor(private readonly favoriteAddresses: FavoriteAddressesService) {}

  @Get()
  list(@GetUser() user: JwtPayload) {
    return this.favoriteAddresses.list(user.sub);
  }

  @Post()
  create(@GetUser() user: JwtPayload, @Body() dto: CreateFavoriteAddressDto) {
    return this.favoriteAddresses.create(user.sub, dto);
  }

  @Patch(':id')
  update(@GetUser() user: JwtPayload, @Param('id') id: string, @Body() dto: UpdateFavoriteAddressDto) {
    return this.favoriteAddresses.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@GetUser() user: JwtPayload, @Param('id') id: string) {
    return this.favoriteAddresses.remove(user.sub, id);
  }
}
