import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type ApiErrorOptions = {
  badRequest?: string;
  unauthorized?: string;
  forbidden?: string;
  notFound?: string;
};

export function ApiCommonErrors(options: ApiErrorOptions = {}) {
  return applyDecorators(
    ApiBadRequestResponse({
      description: options.badRequest ?? 'Bad request',
    }),
    ApiUnauthorizedResponse({
      description: options.unauthorized ?? 'Unauthorized',
    }),
    ApiForbiddenResponse({
      description: options.forbidden ?? 'Forbidden',
    }),
    ApiNotFoundResponse({
      description: options.notFound ?? 'Resource not found',
    }),
  );
}
