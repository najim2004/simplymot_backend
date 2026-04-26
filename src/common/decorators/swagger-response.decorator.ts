import { applyDecorators, HttpStatus } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

type ApiSuccessResponseOptions = {
  summary: string;
  description?: string;
  message?: string;
  status?: HttpStatus.OK | HttpStatus.CREATED;
  data?: Record<string, unknown> | unknown[];
  metaData?: Record<string, unknown>;
  includeAuthErrors?: boolean;
  includeNotFound?: boolean;
};

export function ApiSuccessResponse({
  summary,
  description,
  message = 'Operation completed successfully',
  status = HttpStatus.OK,
  data = {},
  metaData,
  includeAuthErrors = false,
  includeNotFound = false,
}: ApiSuccessResponseOptions) {
  const responseDecorator =
    status === HttpStatus.CREATED ? ApiCreatedResponse : ApiOkResponse;

  return applyDecorators(
    ApiOperation({ summary, description }),
    responseDecorator({
      schema: {
        example: {
          success: true,
          message,
          data,
          ...(metaData ? { meta_data: metaData } : {}),
        },
      },
    }),
    ApiBadRequestResponse({ description: 'Validation or business rule error' }),
    ...(includeAuthErrors
      ? [
          ApiUnauthorizedResponse({ description: 'Missing or invalid JWT' }),
          ApiForbiddenResponse({ description: 'Insufficient permissions' }),
        ]
      : []),
    ...(includeNotFound
      ? [ApiNotFoundResponse({ description: 'Resource not found' })]
      : []),
  );
}
