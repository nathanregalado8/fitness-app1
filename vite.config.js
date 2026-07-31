import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Dev-only bridge so `npm run dev` serves the same serverless function that
 * production deploys (api/ai.js) at the same path. It adapts a Node
 * req/res pair into the (req, res) shape the function expects — parsed
 * `req.body`, plus `res.status().json()` helpers.
 *
 * The Anthropic API key is only ever read inside that module, on the server.
 */
function serverlessApi() {
  return {
    name: 'serverless-api-dev',
    configureServer(server) {
      server.middlewares.use('/api/ai', async (req, res) => {
        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString('utf8');
          req.body = raw ? JSON.parse(raw) : {};

          res.status = (code) => {
            res.statusCode = code;
            return res;
          };
          res.json = (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
            return res;
          };

          // Imported per-request so edits to the handler hot-reload in dev.
          const mod = await server.ssrLoadModule('/api/ai.js');
          await mod.default(req, res);
        } catch (err) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: { message: String(err?.message || err) } }));
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), serverlessApi()],
  server: { port: 5173 },
});
