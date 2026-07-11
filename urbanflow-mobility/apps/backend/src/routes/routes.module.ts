import { Module } from '@nestjs/common'
import { RoutesController } from './routes.controller'
import { RoutesService } from './routes.service'
import { NavitiaModule } from '../navitia/navitia.module'
import { GbfsModule } from '../gbfs/gbfs.module'
import { Co2Module } from '../co2/co2.module'
import { GeoveloModule } from '../geovelo/geovelo.module'

@Module({
  imports: [NavitiaModule, GbfsModule, Co2Module, GeoveloModule],
  controllers: [RoutesController],
  providers: [RoutesService],
})
export class RoutesModule {}
