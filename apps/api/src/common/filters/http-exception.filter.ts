import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * AllExceptionsFilter - Filtro global de excepciones
 * 
 * Captura todas las excepciones no manejadas y devuelve
 * respuestas HTTP consistentes con formato estandarizado
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determinar status code
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extraer mensaje
    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Formato de error estandarizado
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message:
        typeof message === 'object'
          ? (message as any).message || message
          : message,
    };

    // Log del error
    this.logger.error(
      `${request.method} ${request.url} - Status: ${status}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // 🛡️ ZERO TRUST — DIAGNÓSTICO DE ERRORES PRISMA (29-SEP-2026)
    // Un PrismaClientValidationError / PrismaClientKnownRequestError NO es una
    // HttpException: antes caía en el catch-all y devolvía "Internal server error"
    // sin pista alguna, obligando a adivinar. Aquí se traduce a 4xx accionable.
    if (!(exception instanceof HttpException)) {
      const prismaError = exception as {
        name?: string;
        code?: string;
        meta?: Record<string, unknown>;
        message?: string;
      };

      const esPrismaValidation =
        prismaError?.name === 'PrismaClientValidationError' ||
        prismaError?.name === 'PrismaClientUnknownRequestError';

      const esPrismaKnown = prismaError?.code?.startsWith('P');

      if (esPrismaValidation) {
        this.logger.warn(
          `[PRISMA-VALIDATION] ${request.method} ${request.url}: consulta con argumentos/schema inválidos. ` +
          `Revisar nombres de campos y relaciones contra schema.prisma. Detalle: ${prismaError.message}`,
        );
        response.status(HttpStatus.BAD_REQUEST).json({
          ...errorResponse,
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Solicitud inválida: el servidor rechazó los datos enviados (error de esquema interno).',
          diagnostic: 'PRISMA_CLIENT_VALIDATION',
          prismaMessage: prismaError.message,
        });
        return;
      }

      if (esPrismaKnown) {
        const messages: Record<string, string> = {
          P2002: 'Violación de restricción única: ya existe un registro con esos datos.',
          P2003: 'Violación de clave foránea: una referencia enviada no existe.',
          P2025: 'El registro solicitado no existe o fue eliminado.',
          P2034: 'Conflicto de transacción: reintente la operación.',
        };
        this.logger.warn(
          `[PRISMA-KNOWN] ${request.method} ${request.url}: code=${prismaError.code} meta=${JSON.stringify(prismaError.meta)}`,
        );
        response.status(HttpStatus.BAD_REQUEST).json({
          ...errorResponse,
          statusCode: HttpStatus.BAD_REQUEST,
          message: messages[prismaError.code!] ?? `Error de base de datos (${prismaError.code}).`,
          diagnostic: 'PRISMA_KNOWN_REQUEST_ERROR',
          prismaCode: prismaError.code,
          prismaMeta: prismaError.meta,
        });
        return;
      }
    }

    // Enviar respuesta
    response.status(status).json(errorResponse);
  }
}
