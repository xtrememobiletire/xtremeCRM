import { Router, Request, Response } from 'express';
import { openApiSpec } from '../docs/openapi.js';

const router = Router();

/**
 * @route   GET /api/docs/openapi.json
 * @desc    Raw OpenAPI 3.0 specification JSON
 */
router.get(['/openapi.json', '/json'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(openApiSpec);
});

/**
 * @route   GET /api/docs
 * @desc    Interactive Swagger UI Console
 */
router.get(['/', ''], (_req: Request, res: Response) => {
  // Explicitly ensure CSP permits CDN scripts, inline handlers, and eval for Swagger UI
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' https: data: 'unsafe-inline' 'unsafe-eval'; " +
    "script-src 'self' https: 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' https: 'unsafe-inline'; " +
    "img-src 'self' https: data:; " +
    "connect-src 'self' https:;"
  );
  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>XtremeCRM API Documentation (Swagger UI)</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    html { box-sizing: border-box; overflow-y: scroll; }
    *, *:before, *:after { box-sizing: inherit; }
    body { margin: 0; background: #fafafa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    .topbar { background-color: #dc2626 !important; padding: 12px 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); display: flex; align-items: center; justify-content: space-between; }
    .brand-title { display: flex; align-items: center; color: #ffffff; text-decoration: none; font-weight: 800; font-size: 1.2rem; letter-spacing: -0.02em; }
    .brand-badge { background: rgba(0,0,0,0.25); color: #fff; font-size: 0.75rem; font-weight: 600; padding: 3px 8px; border-radius: 9999px; margin-left: 12px; }
    #loading-state { color: #64748b; text-align: center; padding: 80px 20px; font-size: 1.1rem; }
    .spinner { display: inline-block; width: 36px; height: 36px; border: 3px solid rgba(220, 38, 38, 0.2); border-radius: 50%; border-top-color: #dc2626; animation: spin 0.8s linear infinite; margin-bottom: 16px; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="topbar">
    <a href="/api/docs" class="brand-title">
      <span>XTREME MOBILE TIRE</span>
      <span class="brand-badge">REST API CONSOLE v1.0</span>
    </a>
  </div>
  <div id="swagger-ui">
    <div id="loading-state">
      <div class="spinner"></div>
      <div>Loading Interactive Swagger Console...</div>
    </div>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js"></script>
  <script>
    window.onload = function() {
      try {
        const ui = SwaggerUIBundle({
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
        window.ui = ui;
      } catch (err) {
        console.error('Swagger UI init error:', err);
        document.getElementById('swagger-ui').innerHTML = '<div style="color:red;padding:40px;text-align:center;">Failed to initialize Swagger UI. Check browser console.</div>';
      }
    };
  </script>
</body>
</html>`;

  res.status(200).send(html);
});

export default router;
