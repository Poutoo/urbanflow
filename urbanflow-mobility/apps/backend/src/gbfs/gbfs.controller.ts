import { Controller, Get, Query, UseGuards, ParseFloatPipe } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GbfsService, GbfsStation } from './gbfs.service'

@Controller('gbfs')
@UseGuards(JwtAuthGuard)
export class GbfsController {
  constructor(private readonly gbfs: GbfsService) {}

  /** Stations Vélib' à proximité — rafraîchi côté client toutes les 30s */
  @Get('nearby')
  getNearby(
    @Query('lat', ParseFloatPipe) lat: number,
    @Query('lng', ParseFloatPipe) lng: number,
    @Query('radius') radius?: string,
  ): Promise<GbfsStation[]> {
    const parsedRadius = radius ? Number.parseFloat(radius) : undefined
    return this.gbfs.getNearbyStations(
      lat,
      lng,
      parsedRadius && !Number.isNaN(parsedRadius) ? parsedRadius : 400,
    )
  }
}
