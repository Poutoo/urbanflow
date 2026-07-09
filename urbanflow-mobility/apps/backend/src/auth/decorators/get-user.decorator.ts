import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { JwtPayload } from '@urbanflow/types';

/**
 * Extrait le payload JWT (injecté par JwtStrategy.validate) de la requête.
 * À utiliser uniquement derrière JwtAuthGuard.
 */
export const GetUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): JwtPayload => {
  const request = ctx.switchToHttp().getRequest<{ user: JwtPayload }>();
  return request.user;
});
