// Meeting demo (local branch only): runs the real new planner against mocked API data, no Django or login.
// Run from the repo root:  node frontend/demo/serve.mjs   then open http://localhost:5199/preview
// Dev-only Vite server for the preview harness. Root is the repo's frontend/ so deps resolve;
// the preview page itself lives in this scratch folder and is served at /preview.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';


const here = path.dirname(new URL(import.meta.url).pathname);
const FRONTEND = path.resolve(here, '..');
const require = createRequire(path.join(FRONTEND, 'package.json'));
const { createServer } = await import(require.resolve('vite'));
const react = (await import(require.resolve('@vitejs/plugin-react'))).default;

const previewPage = {
  name: 'preview-page',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/preview')) return next();
      const html = fs.readFileSync(path.join(here, req.url.startsWith('/preview-classic') ? 'classic.html' : 'index.html'), 'utf8');
      res.setHeader('Content-Type', 'text/html');
      res.end(await server.transformIndexHtml(req.url, html));
    });
  },
};

const server = await createServer({
  configFile: false,
  root: FRONTEND,
  plugins: [react(), previewPage],
  esbuild: { loader: 'jsx', include: /src\/.*\.jsx?$/ },
  optimizeDeps: { esbuildOptions: { loader: { '.js': 'jsx' } } },
  resolve: {
    alias: {
      components: path.join(FRONTEND, 'src/components'),
      styles: path.join(FRONTEND, 'src/styles'),
      utils: path.join(FRONTEND, 'src/utils'),
      Popover: path.join(FRONTEND, 'src/Popover'),
    },
  },
  server: { port: 5199, strictPort: true, fs: { allow: [here, FRONTEND] } },
});
await server.listen();
console.log('preview ready on http://localhost:5199/preview');
