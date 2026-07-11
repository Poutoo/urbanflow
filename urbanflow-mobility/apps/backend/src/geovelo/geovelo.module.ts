import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GeoveloService } from './geovelo.service'

@Module({
  imports: [HttpModule],
  providers: [GeoveloService],
  exports: [GeoveloService],
})
export class GeoveloModule {}
