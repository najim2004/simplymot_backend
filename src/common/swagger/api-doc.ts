import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiOperationOptions,
} from '@nestjs/swagger';
import {
  ApiSuccessResponse,
  ApiSuccessResponseOptions,
} from '../decorators/swagger-response.decorator';

export function apiDoc(
  operation: ApiOperationOptions,
  success?: ApiSuccessResponseOptions,
) {
  const decorators = [ApiOperation(operation)];
  if (success) {
    decorators.push(ApiSuccessResponse(success));
  }
  return applyDecorators(...decorators);
}

export function apiTypedDoc(
  operation: ApiOperationOptions,
  response: {
    type: Type<unknown>;
    status?: HttpStatus.OK | HttpStatus.CREATED;
  },
) {
  const decorator =
    response.status === HttpStatus.CREATED ? ApiCreatedResponse : ApiOkResponse;
  return applyDecorators(ApiOperation(operation), decorator({ type: response.type }));
}
