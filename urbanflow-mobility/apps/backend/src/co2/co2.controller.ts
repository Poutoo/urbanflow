import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { GetUser } from '../auth/decorators/get-user.decorator'
import { Co2DashboardService } from './co2-dashboard.service'
import { RecordJourneyDto } from './dto/record-journey.dto'
import { Co2Summary } from './dto/co2-stats.dto'
import type { JwtPayload } from '@urbanflow/types'

@Controller('co2')
@UseGuards(JwtAuthGuard)
export class Co2Controller {
  constructor(private readonly dashboard: Co2DashboardService) {}

  /** Valider un trajet → enregistrer le CO₂ économisé */
  @Post('record')
  record(@GetUser() user: JwtPayload, @Body() dto: RecordJourneyDto) {
    return this.dashboard.recordJourney(user.sub, dto)
  }

  /** Graphique barres des 7 derniers jours */
  @Get('weekly')
  weekly(@GetUser() user: JwtPayload) {
    return this.dashboard.getWeeklyStats(user.sub)
  }

  /** Progression vs objectif mensuel */
  @Get('monthly')
  monthly(@GetUser() user: JwtPayload) {
    return this.dashboard.getMonthlyProgress(user.sub)
  }

  /** Répartition par mode de transport */
  @Get('breakdown')
  breakdown(@GetUser() user: JwtPayload) {
    return this.dashboard.getModeBreakdown(user.sub)
  }

  /** Tout en une requête — pour la page /empreinte */
  @Get('summary')
  async summary(@GetUser() user: JwtPayload): Promise<Co2Summary> {
    const [weekly, monthly, breakdown] = await Promise.all([
      this.dashboard.getWeeklyStats(user.sub),
      this.dashboard.getMonthlyProgress(user.sub),
      this.dashboard.getModeBreakdown(user.sub),
    ])
    return { weekly, monthly, breakdown }
  }
}
