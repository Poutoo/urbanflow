import { Module } from '@nestjs/common'
import { HttpModule } from '@nestjs/axios'
import { GbfsService } from './gbfs.service'
import { GbfsController } from './gbfs.controller'

@Module({
  imports: [HttpModule],
  controllers: [GbfsController],
  providers: [GbfsService],
  exports: [GbfsService],
})
export class GbfsModule {}
