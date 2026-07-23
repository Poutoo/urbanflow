import { Module } from '@nestjs/common';
import { FavoriteAddressesService } from './favorite-addresses.service';
import { FavoriteAddressesController } from './favorite-addresses.controller';

@Module({
  controllers: [FavoriteAddressesController],
  providers: [FavoriteAddressesService],
})
export class FavoriteAddressesModule {}
