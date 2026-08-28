import { Controller, Get, Query } from '@nestjs/common'
import { Throttle } from '@nestjs/throttler'
import { PlacesService } from './places.service'

@Controller('places')
@Throttle({ default: { ttl: 60_000, limit: 20 } })
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  search(@Query('q') q: string) {
    return this.places.searchPlaces(q ?? '')
  }
}
