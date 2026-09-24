import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

export function apiError(code: string, message: string): { code: string; message: string } {
  return { code, message };
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const raw = exception.getResponse();
      if (typeof raw === 'object' && raw && 'code' in raw && 'message' in raw) {
        const body = raw as { code: string; message: string | string[] };
        const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
        response.status(status).json({ code: body.code, message });
        return;
      }
      const message =
        typeof raw === 'string'
          ? raw
          : Array.isArray((raw as { message?: unknown }).message)
            ? ((raw as { message: string[] }).message).join(' ')
            : String((raw as { message?: unknown }).message ?? 'Request failed.');
      response.status(status).json({ code: 'REQUEST', message });
      return;
    }
    console.error(exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'SERVER',
      message: 'Something went wrong.',
    });
  }
}
