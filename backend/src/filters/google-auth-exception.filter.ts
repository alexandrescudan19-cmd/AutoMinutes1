import { ArgumentsHost, Catch, ExceptionFilter, UnauthorizedException } from '@nestjs/common';
import type { Request, Response } from 'express';

@Catch(UnauthorizedException)
export class GoogleAuthExceptionFilter implements ExceptionFilter {
  catch(exception: UnauthorizedException, host: ArgumentsHost) {
    // Redirectioneaza erorile OAuth Google. acum.
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();
    const frontendUrl = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
      .split(',')[0]
      .trim()
      .replace(/\/+$/, '');
    const isConnectIntent = Boolean(request.query.state);

    const redirectTarget = isConnectIntent
      ? `${frontendUrl}/settings?googleConnectError=1`
      : `${frontendUrl}/login?googleError=1`;

    response.redirect(redirectTarget);
  }
}
