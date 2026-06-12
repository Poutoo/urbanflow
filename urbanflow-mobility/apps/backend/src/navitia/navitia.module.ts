import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { NavitiaService } from './navitia.service'

@Module({
  imports: [HttpModule],
  providers: [NavitiaService],
  exports: [NavitiaService],
})
export class NavitiaModule {}
