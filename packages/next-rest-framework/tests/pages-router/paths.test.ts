import {
  resetCustomGlobals,
  getExpectedSpec,
  expectOpenAPIGenerationErrors,
  createMockApiRouteRequest
} from '../utils';
import {
  NEXT_REST_FRAMEWORK_USER_AGENT,
  ValidMethod
} from '../../src/constants';
import { z } from 'zod';
import chalk from 'chalk';
import * as openApiUtils from '../../src/shared/open-api';
import { apiRoute, apiRouteOperation, docsApiRoute } from '../../src';

const createDirent = (name: string) => ({
  isDirectory: () => false,
  name
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdirSync: (path: string) => {
    const paths = path.includes('pages')
      ? [
          'foo.ts',
          'foo/bar.ts',
          'foo/bar/baz.ts',
          'foo/bar/[baz]/index.ts',
          'foo/bar/[baz]/qux/[fred]/index.ts'
        ]
      : [];

    return paths.map(createDirent);
  },
  existsSync: () => true
}));

const generateOpenApiSpecSpy = jest.spyOn(openApiUtils, 'generateOpenApiSpec');

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  basename: () => 'not-route.js'
}));

beforeEach(() => {
  resetCustomGlobals();
});

const schema = z.object({ foo: z.string() });

const fooMethodHandlers = apiRoute({
  foo: apiRouteOperation({ method: 'POST' })
    .input({
      contentType: 'application/json',
      body: schema,
      query: z.object({
        foo: z.string()
      })
    })
    .outputs([
      {
        status: 201,
        schema,
        contentType: 'application/json'
      }
    ])
    .handler(async (req, res) => {
      res.status(201).json(req.body);
    })
});

const fooBarMethodHandlers = apiRoute({
  fooBar: apiRouteOperation({ method: 'PUT' })
    .input({
      contentType: 'application/json',
      body: schema,
      query: z.object({
        foo: z.string()
      })
    })
    .outputs([
      {
        status: 203,
        schema,
        contentType: 'application/json'
      }
    ])
    .handler(async (req, res) => {
      res.status(203).json(req.body);
    })
});

const fooBarBazMethodHandlers = apiRoute({
  fooBarBaz: apiRouteOperation({ method: 'GET' })
    .outputs([
      {
        status: 200,
        schema,
        contentType: 'application/json'
      }
    ])
    .handler(async (_req, res) => {
      res.status(200).json({ foo: 'bar' });
    })
});

const fooBarBazQuxMethodHandlers = apiRoute({
  fooBarBazQux: apiRouteOperation({ method: 'GET' })
    .outputs([
      {
        status: 200,
        schema,
        contentType: 'application/json'
      }
    ])
    .handler(async (_req, res) => {
      res.status(200).json({ foo: 'bar' });
    })
});

const fooBarBazQuxFredMethodHandlers = apiRoute({
  fooBarBazQuxFred: apiRouteOperation({ method: 'GET' })
    .outputs([
      {
        status: 200,
        schema,
        contentType: 'application/json'
      }
    ])
    .handler(async (_req, res) => {
      res.status(200).json({ foo: 'corge' });
    })
});

jest.mock(
  '../../../apps/src/dev/app/api/foo/route.ts',
  () => fooMethodHandlers,
  {
    virtual: true
  }
);

jest.mock(
  '../../../apps/src/dev/app/api/foo/bar/route.ts',
  () => fooBarBazMethodHandlers,
  { virtual: true }
);

jest.mock(
  '../../../apps/src/dev/app/api/foo/bar/baz/route.ts',
  () => fooBarBazMethodHandlers,
  { virtual: true }
);

jest.mock(
  '../../../apps/src/dev/app/api/foo/bar/[baz]/route.ts',
  () => fooBarBazQuxMethodHandlers,
  { virtual: true }
);

jest.mock(
  '../../../apps/src/dev/app/api/foo/bar/[baz]/qux/[fred]/route.ts',
  () => fooBarBazQuxFredMethodHandlers,
  { virtual: true }
);

// @ts-expect-error: TS expects the mock function to extend the typings of the global `fetch` function but we don't need those types here.
global.fetch = async (url: string) => {
  const path = url.replace('http://localhost:3000', '');

  const { req, res } = createMockApiRouteRequest({
    method: ValidMethod.GET,
    path,
    query: {
      foo: 'bar'
    },
    headers: {
      'user-agent': NEXT_REST_FRAMEWORK_USER_AGENT
    }
  });

  const handlersForPaths = {
    '/api/foo': fooMethodHandlers,
    '/api/foo/bar': fooBarMethodHandlers,
    '/api/foo/bar/baz': fooBarBazMethodHandlers,
    '/api/foo/bar/{baz}': fooBarBazQuxMethodHandlers,
    '/api/foo/bar/{baz}/qux/{fred}': fooBarBazQuxFredMethodHandlers
  };

  const methodHandlers =
    handlersForPaths[path as keyof typeof handlersForPaths];

  await methodHandlers(req, res);
  const json = async () => res._getJSONData();

  return {
    json,
    status: 200
  };
};

it('auto-generates the paths from the internal endpoint responses', async () => {
  const { req, res } = createMockApiRouteRequest({
    method: ValidMethod.GET,
    path: '/api'
  });

  await docsApiRoute()(req, res);

  const spec = getExpectedSpec({
    zodSchema: schema,
    allowedPaths: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ],
    deniedPaths: []
  });

  expect(generateOpenApiSpecSpy).toHaveBeenCalledWith(
    expect.objectContaining({ spec })
  );
});

it('does not generate paths in prod', async () => {
  const { env } = process.env;
  process.env.NODE_ENV = 'production';

  const { req, res } = createMockApiRouteRequest({
    method: ValidMethod.GET,
    path: '/api'
  });

  await docsApiRoute()(req, res);
  expect(generateOpenApiSpecSpy).not.toHaveBeenCalled();
  process.env.NODE_ENV = env;
});

it.each([
  {
    allowedPaths: ['*'],
    expectedPathsToBeAllowed: [],
    expectedPathsToBeDenied: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ]
  },
  {
    allowedPaths: ['**'],
    expectedPathsToBeAllowed: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ],
    expectedPathsToBeDenied: []
  },
  {
    allowedPaths: ['/api/foo'],
    expectedPathsToBeAllowed: ['/api/foo'],
    expectedPathsToBeDenied: [
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ]
  },
  {
    allowedPaths: ['/api/foo/*/baz'],
    expectedPathsToBeAllowed: ['/api/foo/bar/baz'],
    expectedPathsToBeDenied: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ]
  },
  {
    allowedPaths: ['/api/foo/**'],
    expectedPathsToBeAllowed: [
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ],
    expectedPathsToBeDenied: ['/api/foo']
  }
])(
  'auto-generates the paths from the internal endpoint responses when allowing specific routes: $allowedPaths',
  async ({
    allowedPaths,
    expectedPathsToBeAllowed,
    expectedPathsToBeDenied
  }) => {
    console.info = jest.fn();

    const { req, res } = createMockApiRouteRequest({
      method: ValidMethod.GET,
      path: '/api'
    });

    await docsApiRoute({
      allowedPaths
    })(req, res);

    const spec = getExpectedSpec({
      zodSchema: schema,
      allowedPaths: expectedPathsToBeAllowed,
      deniedPaths: expectedPathsToBeDenied
    });

    expect(generateOpenApiSpecSpy).toHaveBeenCalledWith(
      expect.objectContaining({ spec })
    );

    if (expectedPathsToBeDenied.length) {
      expect(console.info).toHaveBeenNthCalledWith(
        3,
        chalk.yellowBright(
          `The following paths are ignored by Next REST Framework: ${chalk.bold(
            expectedPathsToBeDenied.map((p) => `\n- ${p}`)
          )}`
        )
      );
    }
  }
);

it.each([
  {
    deniedPaths: ['*'],
    expectedPathsToBeAllowed: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ],
    expectedPathsToBeDenied: []
  },
  {
    deniedPaths: ['**'],
    expectedPathsToBeAllowed: [],
    expectedPathsToBeDenied: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ]
  },
  {
    deniedPaths: ['/api/foo'],
    expectedPathsToBeAllowed: [
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ],
    expectedPathsToBeDenied: ['/api/foo']
  },
  {
    deniedPaths: ['/api/foo/*/baz'],
    expectedPathsToBeAllowed: [
      '/api/foo',
      '/api/foo/bar',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ],
    expectedPathsToBeDenied: ['/api/foo/bar/baz']
  },
  {
    deniedPaths: ['/api/foo/**'],
    expectedPathsToBeAllowed: ['/api/foo'],
    expectedPathsToBeDenied: [
      '/api/foo/bar',
      '/api/foo/bar/baz',
      '/api/foo/bar/{baz}',
      '/api/foo/bar/{baz}/qux/{fred}'
    ]
  }
])(
  'auto-generates the paths from the internal endpoint responses when denying specific routes: $deniedPaths',
  async ({
    deniedPaths,
    expectedPathsToBeAllowed,
    expectedPathsToBeDenied
  }) => {
    console.info = jest.fn();

    const { req, res } = createMockApiRouteRequest({
      method: ValidMethod.GET,
      path: '/api'
    });

    await docsApiRoute({
      deniedPaths
    })(req, res);

    const spec = getExpectedSpec({
      zodSchema: schema,
      allowedPaths: expectedPathsToBeAllowed,
      deniedPaths: expectedPathsToBeDenied
    });

    expect(generateOpenApiSpecSpy).toHaveBeenCalledWith(
      expect.objectContaining({ spec })
    );

    if (expectedPathsToBeDenied.length) {
      expect(console.info).toHaveBeenNthCalledWith(
        3,
        chalk.yellowBright(
          `The following paths are ignored by Next REST Framework: ${chalk.bold(
            expectedPathsToBeDenied.map((p) => `\n- ${p}`)
          )}`
        )
      );
    }
  }
);

it('handles error if the OpenAPI spec generation fails', async () => {
  console.error = jest.fn();

  jest.mock('../../src/shared/open-api', () => {
    return {
      __esModule: true,
      ...jest.requireActual('../../src/shared/open-api')
    };
  });

  const error = 'Something went wrong';

  jest
    .spyOn(openApiUtils, 'getOasDataFromOperations')
    .mockImplementation(() => {
      throw Error(error);
    });

  const { req, res } = createMockApiRouteRequest({
    method: ValidMethod.GET,
    path: '/api'
  });

  await docsApiRoute()(req, res);

  const spec = getExpectedSpec({
    zodSchema: schema,
    allowedPaths: [],
    deniedPaths: []
  });

  expect(generateOpenApiSpecSpy).toHaveBeenCalledWith(
    expect.objectContaining({ spec })
  );

  expectOpenAPIGenerationErrors(error);
});

it('returns 403 if the docs handler is called internally by the framework', async () => {
  const { req, res } = createMockApiRouteRequest({
    method: ValidMethod.GET,
    path: '/api',
    headers: {
      'user-agent': NEXT_REST_FRAMEWORK_USER_AGENT
    }
  });

  await docsApiRoute()(req, res);
  expect(res.statusCode).toEqual(403);

  expect(res._getJSONData()).toEqual({
    message: `${NEXT_REST_FRAMEWORK_USER_AGENT} user agent is not allowed.`
  });
});
