---
sidebar_position: 3
---

# API reference

### [Docs handler options](#docs-handler-options)

The following options can be passed to the `docsRouteHandler` (App Router) and `docsApiRouteHandler` (Pages Router) functions for customizing Next REST Framework:

| Name                      | Description                                                                                                                                                                                                                                                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `deniedPaths`             | Array of paths that are denied by Next REST Framework and not included in the OpenAPI spec. Supports wildcards using asterisk `*` and double asterisk `**` for recursive matching. Example: `['/api/disallowed-path', '/api/disallowed-path-2/*', '/api/disallowed-path-3/**']` Defaults to no paths being disallowed. |
| `allowedPaths`            | Array of paths that are allowed by Next REST Framework and included in the OpenAPI spec. Supports wildcards using asterisk `*` and double asterisk `**` for recursive matching. Example: `['/api/allowed-path', '/api/allowed-path-2/*', '/api/allowed-path-3/**']` Defaults to all paths being allowed.               |
| `openApiObject`           | An [OpenAPI Object](https://swagger.io/specification/#openapi-object) that can be used to override and extend the auto-generated specification.                                                                                                                                                                        |
| `openApiJsonPath`         | Path that will be used for fetching the OpenAPI spec - defaults to `/openapi.json`. This path also determines the path where this file will be generated inside the `public` folder.                                                                                                                                   |
| `autoGenerateOpenApiSpec` | Setting this to `false` will not automatically update the generated OpenAPI spec when calling the docs handler endpoints. Defaults to `true`.                                                                                                                                                                          |
| `docsConfig`              | A [Docs config](#docs-config) object for customizing the generated docs.                                                                                                                                                                                                                                               |
| `suppressInfo`            | Setting this to `true` will suppress all informational logs from Next REST Framework. Defaults to `false`.                                                                                                                                                                                                             |

### [Docs config](#docs-config)

The docs config options can be used to customize the generated docs:

| Name          | Description                                                                                                 |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| `provider`    | Determines whether to render the docs using Redoc (`redoc`) or SwaggerUI `swagger-ui`. Defaults to `redoc`. |
| `title`       | Custom title, used for the visible title and HTML title.                                                    |
| `description` | Custom description, used for the visible description and HTML meta description.                             |
| `faviconUrl`  | Custom HTML meta favicon URL.                                                                               |
| `logoUrl`     | A URL for a custom logo.                                                                                    |

### REST

#### [Route handler options](#route-handler-options)

The following options cam be passed to the `routeHandler` (App Router) and `apiRouteHandler` (Pages Router) functions to create new API endpoints:

| Name                                                       | Description                                                                                                                                                 | Required |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `GET \| PUT \| POST \| DELETE \| OPTIONS \| HEAD \| PATCH` | A [Method handler](#method-handlers) object.                                                                                                                | `true`   |
| `openApiPath`                                              | An OpenAPI [Path Item Object](https://swagger.io/specification/#path-item-object) that can be used to override and extend the auto-generated specification. | `false`  |

#### [Route operations](#route-operations)

The route operation functions `routeOperation` (App Router) and `apiRouteOperation` (Pages Router) allow you to define your API handlers for your endpoints. These functions accept an OpenAPI [Operation object](https://swagger.io/specification/#operation-object) as a parameter, that can be used to override the auto-generated specification. Calling this function allows you to chain your API handler logic with the following functions.

| Name         | Description                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `input`      | A [Route operation input](#route-operation-input) function for defining the validation and documentation of the request.       |
| `outputs`    | An [Route operation outputs](#route-operation-outputs) function for defining the validation and documentation of the response. |
| `handler`    | A [Route operation-handler](#route-operation-handler) function for defining your business logic.                               |
| `middleware` | A [Route operation middleware](#route-operation-middleware) function that gets executed before the request input is validated. |

##### [Route operation input](#route-operation-input)

The route operation input function is used for type-checking, validation and documentation of the request, taking in an object with the following properties:

| Name          | Description                                                                                                                                                                                            | Required |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `contentType` | The content type header of the request. When the content type is defined, a request with an incorrect content type header will get an error response.                                                  | `false`  |
| `body`        | A [Zod](https://github.com/colinhacks/zod) schema describing the format of the request body. When the body schema is defined, a request with an invalid request body will get an error response.       | `false`  |
| `query`       | A [Zod](https://github.com/colinhacks/zod) schema describing the format of the query parameters. When the query schema is defined, a request with invalid query parameters will get an error response. | `false`  |

Calling the route operation input function allows you to chain your API handler logic with the [Route operation outputs](#route-operation-outputs), [Route operation middleware](#route-operation-middleware) and [Route operation handler](#route-operation-handler) functions.

##### [Route operation outputs](#route-operation-outputs)

The route operation outputs function is used for type-checking and documentation of the response, taking in an array of objects with the following properties:

| Name          | Description                                                                                   | Required |
| ------------- | --------------------------------------------------------------------------------------------- | -------- |
| `status`      | A status code that your API can return.                                                       | `true`   |
| `contentType` | The content type header of the response.                                                      | `true`   |
| `schema`      | A [Zod](https://github.com/colinhacks/zod) schema describing the format of the response data. |  `true`  |

Calling the route operation outputs function allows you to chain your API handler logic with the [Route operation middleware](#route-operation-middleware) and [Route operation handler](#route-operation-handler) functions.

##### [Route operation middleware](#route-operation-middleware)

The route operation middleware function is executed before validating the request input. The function takes in the same parameters as the Next.js [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) and [API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) handlers.

Calling the route operation middleware function allows you to chain your API handler logic with the [Handler](#handler) function.

##### [Route operation handler](#route-operation-handler)

The route operation handler function is a strongly-typed function to implement the business logic for your API. The function takes in strongly-typed versions of the same parameters as the Next.js [Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers) and [API Routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) handlers.

### RPC

#### [RPC route handler options](#rpc-route-handler-options)

The `rpcRouteHandler` (App Router) and `rpcApiRouteHandler` (Pages Router) functions allow the following options as the second parameter after passing your RPC operations.

| Name               | Description                                                                                                                                                 | Required |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `openApiPath`      | An OpenAPI [Path Item Object](https://swagger.io/specification/#path-item-object) that can be used to override and extend the auto-generated specification. | `false`  |
| `openApiOperation` | An OpenAPI [Path Item Object](https://swagger.io/specification/#operation-object) that can be used to override and extend the auto-generated specification. | `false`  |

#### [RPC operations](#rpc-route-operations)

The `rpcOperation` function allows you to define your API handlers for your RPC endpoint. Calling this function allows you to chain your API handler logic with the following functions.

| Name         | Description                                                                                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `input`      | An [RPC operation input](#rpc-operation-input) function for defining the validation and documentation of the operation.       |
| `outputs`    | An [RPC operation outputs](#rpc-operation-outputs) function for defining the validation and documentation of the response.    |
| `handler`    | An [RPC operation handler](#rpc-operation-handler) function for defining your business logic.                                 |
| `middleware` | An [RPC operation middleware](#rpc-operation-middleware) function that gets executed before the operation input is validated. |

##### [RPC operation input](#rpc-operation-input)

The RPC operation input function is used for type-checking, validation and documentation of the RPC call. It takes in a A [Zod](https://github.com/colinhacks/zod) schema as a parameter that describes the format of the operation input. When the input schema is defined, an RPC call with invalid input will get an error response.

Calling the RPC input function allows you to chain your API handler logic with the [RPC operation outputs](#rpc-operation-outputs), [RPC middleware](#rpc-operation-middleware) and [RPC handler](#rpc-operation-handler) functions.

##### [RPC operation outputs](#rpc-operation-outputs)

The RPC operation outputs function is used for type-checking and documentation of the response, taking in an array of objects with the following properties:

| Name     | Description                                                                                   | Required |
| -------- | --------------------------------------------------------------------------------------------- | -------- |
| `schema` | A [Zod](https://github.com/colinhacks/zod) schema describing the format of the response data. |  `true`  |
| `name`   | An optional name used in the generated OpenAPI spec, e.g. `GetTodosErrorResponse`.            | `false`  |

Calling the RPC operation outputs function allows you to chain your API handler logic with the [RPC operation middleware](#rpc-operation-middleware) and [RPC operation handler](#rpc-operation-handler) functions.

##### [RPC operation middleware](#rpc-operation-middleware)

The RPC operation middleware function is executed before validating RPC operation input. The function takes in strongly typed parameters typed by the [RPC operation input](#rpc-operation-input) function.

Calling the RPC operation middleware function allows you to chain your RPC API handler logic with the [RPC operation handler](#rpc-operation-handler) function.

##### [RPC operation handler](#rpc-operation-handler)

The RPC operation handler function is a strongly-typed function to implement the business logic for your API. The function takes in strongly typed parameters typed by the [RPC operation input](#rpc-operation-input) function.

## [CLI](#cli)

The Next REST Framework CLI supports generating and validating the `openapi.json` file:

- `npx next-rest-framework generate` to generate the `openapi.json` file.
- `npx next-rest-framework validate` to validate that the `openapi.json` file is up-to-date.

The `next-rest-framework validate` command is useful to have as part of the static checks in your CI/CD pipeline. Both commands support the following options:

| Name                    | Description                                                                                                                                                                                    |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--skipBuild <boolean>` | By default, `next build` is used to build your routes. If you have already created the build, you can skip this step by setting this to `true`.                                                |
| `--distDir <string>`    | Path to your production build directory. Defaults to `.next`.                                                                                                                                  |
| `--timeout <string>`    | The timeout for generating the OpenAPI spec. Defaults to 60 seconds.                                                                                                                           |
| `--configPath <string>` | In case you have multiple docs handlers with different configurations, you can specify which configuration you want to use by providing the path to the API. Example: `/api/my-configuration`. |
| `--debug <boolean>`     | Inherit and display logs from the `next build` command. Defaults to `false`.                                                                                                                   |
