import { Controller, Get, Query } from '@nestjs/common'
import { PlacesService } from './places.service'

@Controller('places')
export class PlacesController {
  constructor(private readonly places: PlacesService) {}

  @Get()
  search(@Query('q') q: string) {
    return this.places.searchPlaces(q ?? '')
  }
}
