import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { RoutesService } from './routes.service'
import { SearchRoutesDto } from './dto/search-routes.dto'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'

@Controller('routes')
@UseGuards(JwtAuthGuard)
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('search')
  search(@Body() dto: SearchRoutesDto) {
    return this.routesService.searchRoutes(dto)
  }
}
