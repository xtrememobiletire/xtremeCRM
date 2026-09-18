import { Router, Request, Response } from 'express';
import { openApiSpec } from '../docs/openapi.js';

const router = Router();

/**
 * @route   GET /api/docs/openapi.json
 * @desc    Raw OpenAPI 3.0 specification JSON
 */
router.get('/openapi.json', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openApiSpec);
});

/**
 * @route   GET /api/docs
 * @desc    Interactive Swagger UI Console
 */
router.get('/', (_req: Request, res: Response) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>XtremeCRM API Documentation (Swagger UI)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; font-family: sans-serif; }
    .topbar { background-color: #DC2626 !important; padding: 10px 0; }
    .topbar-wrapper img { content: url('https://raw.githubusercontent.com/swagger-api/swagger-ui/master/dist/favicon-32x32.png'); }
    .swagger-ui .topbar a { display: flex; align-items: center; color: #fff; font-weight: bold; font-size: 1.2rem; text-decoration: none; }
    .swagger-ui .topbar a span { margin-left: 10px; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      window.ui = SwaggerUIBundle({
        url: '/api/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        layout: 'StandaloneLayout',
        docExpansion: 'list',
        filter: true,
      });
    };
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
});

export default router;
