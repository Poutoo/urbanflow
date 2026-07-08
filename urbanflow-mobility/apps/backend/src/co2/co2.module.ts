import { Module } from '@nestjs/common'
import { Co2Service } from './co2.service'
import { Co2DashboardService } from './co2-dashboard.service'
import { Co2Controller } from './co2.controller'

@Module({
  controllers: [Co2Controller],
  providers: [Co2Service, Co2DashboardService],
  exports: [Co2Service],
})
export class Co2Module {}
