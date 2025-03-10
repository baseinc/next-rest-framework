import { DEFAULT_ERRORS, NEXT_REST_FRAMEWORK_USER_AGENT } from '../constants';
import { type NextRestFrameworkConfig } from '../types';
import { fetchOasDataFromDev, getConfig, syncOpenApiSpec } from '../shared';
import { type NextApiRequest, type NextApiResponse } from 'next/types';
import { getHtmlForDocs } from '../shared/docs';
import { logInitInfo, logNextRestFrameworkError } from '../shared/logging';

export const docsApiRoute = (_config?: NextRestFrameworkConfig) => {
  const config = getConfig(_config);

  const handler = async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      const host = req.headers.host ?? '';

      if (process.env.NODE_ENV !== 'production') {
        const proto = req.headers['x-forwarded-proto'] ?? 'http';
        const baseUrl = `${proto}://${host}`;
        const url = baseUrl + req.url;

        // Return 403 if called internally by the framework.
        if (req.headers['user-agent'] === NEXT_REST_FRAMEWORK_USER_AGENT) {
          res.status(403).json({
            message: `${NEXT_REST_FRAMEWORK_USER_AGENT} user agent is not allowed.`
          });

          return;
        }

        if (!config.suppressInfo) {
          logInitInfo({ config, baseUrl, url });
        }

        if (config.autoGenerateOpenApiSpec) {
          const nrfOasData = await fetchOasDataFromDev({
            config,
            baseUrl,
            url
          });

          await syncOpenApiSpec({ config, nrfOasData });
        }
      }

      const html = getHtmlForDocs({ config, host });

      res.setHeader('Content-Type', 'text/html');
      res.status(200).send(html);
    } catch (error) {
      logNextRestFrameworkError(error);
      res.status(500).json({ message: DEFAULT_ERRORS.unexpectedError });
    }
  };

  handler._nextRestFrameworkConfig = config;
  return handler;
};
