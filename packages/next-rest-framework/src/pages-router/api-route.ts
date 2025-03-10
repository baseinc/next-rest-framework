import { DEFAULT_ERRORS, NEXT_REST_FRAMEWORK_USER_AGENT } from '../constants';
import {
  isValidMethod,
  validateSchema,
  logNextRestFrameworkError,
  getOasDataFromOperations
} from '../shared';
import { type NextApiRequest, type NextApiResponse } from 'next/types';
import { type OpenApiPathItem } from '../types';
import { type ApiRouteOperationDefinition } from './api-route-operation';

export const apiRoute = <T extends Record<string, ApiRouteOperationDefinition>>(
  operations: T,
  options?: {
    openApiPath?: OpenApiPathItem;
  }
) => {
  const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const { method, body, query, headers, url: pathname } = req;

      const handleMethodNotAllowed = () => {
        res.setHeader(
          'Allow',
          Object.values(operations)
            .map(({ method }) => method)
            .join(', ')
        );

        res.status(405).json({ message: DEFAULT_ERRORS.methodNotAllowed });
      };

      if (!isValidMethod(method)) {
        handleMethodNotAllowed();
        return;
      }

      if (
        process.env.NODE_ENV !== 'production' &&
        headers['user-agent'] === NEXT_REST_FRAMEWORK_USER_AGENT
      ) {
        const route = decodeURIComponent(pathname ?? '');

        try {
          const nrfOasData = getOasDataFromOperations({
            operations,
            options,
            route
          });

          res.status(200).json({ nrfOasData });
          return;
        } catch (error) {
          throw Error(`OpenAPI spec generation failed for route: ${route}
${error}`);
        }
      }

      const operation = Object.entries(operations).find(
        ([_operationId, operation]) => operation.method === method
      )?.[1];

      if (!operation) {
        handleMethodNotAllowed();
        return;
      }

      const { input, handler, middleware } = operation;

      if (middleware) {
        await middleware(req, res);

        if (res.writableEnded) {
          return;
        }
      }

      if (input) {
        const { body: bodySchema, query: querySchema, contentType } = input;

        if (
          contentType &&
          headers['content-type']?.split(';')[0] !== contentType
        ) {
          res.status(415).json({ message: DEFAULT_ERRORS.invalidMediaType });
          return;
        }

        if (bodySchema) {
          const { valid, errors } = await validateSchema({
            schema: bodySchema,
            obj: body
          });

          if (!valid) {
            res.status(400).json({
              message: DEFAULT_ERRORS.invalidRequestBody,
              errors
            });

            return;
          }
        }

        if (querySchema) {
          const { valid, errors } = await validateSchema({
            schema: querySchema,
            obj: query
          });

          if (!valid) {
            res.status(400).json({
              message: DEFAULT_ERRORS.invalidQueryParameters,
              errors
            });

            return;
          }
        }
      }

      if (!handler) {
        throw Error(DEFAULT_ERRORS.handlerNotFound);
      }

      await handler(req, res);
    } catch (error) {
      logNextRestFrameworkError(error);
      res.status(500).json({ message: DEFAULT_ERRORS.unexpectedError });
    }
  };

  handler._getPaths = (route: string) =>
    getOasDataFromOperations({
      operations,
      options,
      route
    });

  return handler;
};
