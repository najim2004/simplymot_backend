import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';

type ApiSuccessResponseOptions = {
  message?: string;
  status?: HttpStatus.OK | HttpStatus.CREATED;
  data?: Record<string, unknown> | unknown[];
  metaData?: Record<string, unknown>;
  type?: Type<unknown>;
};

/**
 * Documents the success response body only.
 * Pair every usage with `@ApiOperation({ summary, description })` on the same handler.
 */
export function ApiSuccessResponse({
  message = 'Operation completed successfully',
  status = HttpStatus.OK,
  data = {},
  metaData,
  type,
}: ApiSuccessResponseOptions) {
  const responseDecorator =
    status === HttpStatus.CREATED ? ApiCreatedResponse : ApiOkResponse;

  if (type) {
    return applyDecorators(responseDecorator({ type }));
  }

  return applyDecorators(
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
  );
}

export function ApiSuccessEnvelope<T extends Type<unknown>>(
  dataType: T,
  options: {
    isArray?: boolean;
    hasMeta?: boolean;
    status?: HttpStatus.OK | HttpStatus.CREATED;
  } = {},
) {
  const responseDecorator =
    options.status === HttpStatus.CREATED
      ? ApiCreatedResponse
      : ApiOkResponse;

  const dataSchema = options.isArray
    ? { type: 'array', items: { $ref: getSchemaPath(dataType) } }
    : { $ref: getSchemaPath(dataType) };

  return applyDecorators(
    responseDecorator({
      schema: {
        type: 'object',
        required: ['success', 'message', 'data'],
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: dataSchema,
          ...(options.hasMeta
            ? {
                meta_data: {
                  type: 'object',
                  additionalProperties: true,
                },
              }
            : {}),
        },
      },
    }),
  );
}
