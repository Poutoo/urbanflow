import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GbfsService } from './gbfs.service'

@Module({
  imports: [HttpModule],
  providers: [GbfsService],
  exports: [GbfsService],
})
export class GbfsModule {}
