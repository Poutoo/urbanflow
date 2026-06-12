import { Module } from '@nestjs/common'
import { Co2Service } from './co2.service'

@Module({
  providers: [Co2Service],
  exports: [Co2Service],
})
export class Co2Module {}
