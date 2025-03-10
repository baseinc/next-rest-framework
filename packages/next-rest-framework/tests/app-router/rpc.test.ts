import { validateSchema } from '../../src/shared';
import { DEFAULT_ERRORS, ValidMethod } from '../../src/constants';
import { createMockRpcRouteRequest } from '../utils';
import { z } from 'zod';
import { rpcOperation, rpcRoute } from '../../src';

it.each(Object.values(ValidMethod))(
  'only works with HTTP method POST: %p',
  async (method) => {
    const { req, context } = createMockRpcRouteRequest({
      method
    });

    const data = ['All good!'];

    const operation = rpcOperation()
      .outputs([{ schema: z.array(z.string()) }])
      .handler(() => data);

    const res = await rpcRoute({
      test: operation
    }).POST(req, context);

    if (method === ValidMethod.POST) {
      const json = await res?.json();
      expect(res?.status).toEqual(200);
      expect(json).toEqual(data);
    } else {
      expect(res?.status).toEqual(405);
      expect(res?.headers.get('Allow')).toEqual('POST');
    }
  }
);

it('returns error for missing operation', async () => {
  const { req, context } = createMockRpcRouteRequest({
    operation: 'does-not-exist'
  });

  const res = await rpcRoute({
    // @ts-expect-error: Intentionally invalid.
    test: rpcOperation().handler()
  }).POST(req, context);

  const json = await res?.json();
  expect(res?.status).toEqual(400);

  expect(json).toEqual({
    message: DEFAULT_ERRORS.operationNotAllowed
  });
});

it('returns error for invalid request body', async () => {
  const body = {
    foo: 'bar'
  };

  const { req, context } = createMockRpcRouteRequest({
    body
  });

  const schema = z.object({
    foo: z.number()
  });

  const res = await rpcRoute({
    test: rpcOperation()
      .input(schema)
      .handler(() => {})
  }).POST(req, context);

  const json = await res?.json();
  expect(res?.status).toEqual(400);

  const { errors } = await validateSchema({ schema, obj: body });

  expect(json).toEqual({
    message: DEFAULT_ERRORS.invalidRequestBody,
    errors
  });
});

it('returns a default error response', async () => {
  const { req, context } = createMockRpcRouteRequest();

  console.error = jest.fn();

  const res = await rpcRoute({
    test: rpcOperation().handler(() => {
      throw Error('Something went wrong');
    })
  }).POST(req, context);

  const json = await res?.json();
  expect(res?.status).toEqual(500);

  expect(json).toEqual({
    message: DEFAULT_ERRORS.unexpectedError
  });
});

it('executes middleware before validating input', async () => {
  const body = {
    foo: 'bar'
  };

  const { req, context } = createMockRpcRouteRequest({ body });

  const schema = z.object({
    foo: z.number()
  });

  console.log = jest.fn();

  const res = await rpcRoute({
    test: rpcOperation()
      .input(schema)
      .middleware(() => {
        console.log('foo');
      })
      .handler(() => {})
  }).POST(req, context);

  expect(console.log).toHaveBeenCalledWith('foo');

  const json = await res?.json();
  expect(res?.status).toEqual(400);

  const { errors } = await validateSchema({ schema, obj: body });

  expect(json).toEqual({
    message: DEFAULT_ERRORS.invalidRequestBody,
    errors
  });
});

it('does not execute handler if middleware returns a response', async () => {
  const { req, context } = createMockRpcRouteRequest();

  console.log = jest.fn();

  const res = await rpcRoute({
    test: rpcOperation()
      .middleware(() => {
        return { foo: 'bar' };
      })
      .handler(() => {
        console.log('foo');
      })
  }).POST(req, context);

  const json = await res?.json();
  expect(res?.status).toEqual(200);

  expect(json).toEqual({
    foo: 'bar'
  });

  expect(console.log).not.toHaveBeenCalled();
});
