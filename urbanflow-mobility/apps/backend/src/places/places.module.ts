import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { PlacesController } from './places.controller'
import { PlacesService } from './places.service'

@Module({
  imports: [HttpModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule {}
