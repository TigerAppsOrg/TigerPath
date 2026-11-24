// Meeting demo (local branch only): runs the real new planner against mocked API data, no Django or login.
// Run from the repo root:  node frontend/demo/serve.mjs   then open http://localhost:5199/preview
// Dev-only Vite server for the preview harness. Root is the repo's frontend/ so deps resolve;
// the preview page itself lives in this scratch folder and is served at /preview.
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync } from 'child_process';


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

// Real transcript parsing for the demo: the uploaded PDF goes to tigerpath/transcript.py (the same
// parser the Django endpoint uses) via parse_transcript.py. Course titles come from this small demo
// catalog; codes not in it are reported as "not in the TigerPath catalog", like the real app.
const REPO = path.resolve(FRONTEND, '..');
const PYTHON = path.join(REPO, '.venv/bin/python');
const DEMO_CATALOG = {
  'ECO 100': { id: '1', name: 'ECO 100', title: 'Introduction to Microeconomics', semester: 'both', semester_list: ['f25', 's26'], dist_area: 'SA' },
  'COS 126': { id: '5', name: 'COS 126 / EGR 126', title: 'Computer Science: An Interdisciplinary Approach', semester: 'both', semester_list: ['f25', 's26'], dist_area: 'QCR' },
  'COS 226': { id: '11', name: 'COS 226', title: 'Algorithms and Data Structures', semester: 'both', semester_list: ['f25', 's26'], dist_area: 'QCR' },
  'MAT 202': { id: 'mat202', name: 'MAT 202', title: 'Linear Algebra with Applications', semester: 'both', semester_list: ['f25', 's26'], dist_area: 'QCR' },
  'HIN 105': { id: 'hin105', name: 'HIN 105', title: 'Intermediate Hindi I', semester: 'fall', semester_list: ['f25'], dist_area: '' },
  'WRI 140': { id: 'wri140', name: 'WRI 140', title: 'Writing Seminar', semester: 'both', semester_list: ['f25', 's26'], dist_area: '' },
  'MAT 103': { id: '3', name: 'MAT 103', title: 'Calculus I', semester: 'both', semester_list: ['f25', 's26'], dist_area: 'QCR' },
};

function uploadedFile(body, contentType) {
  const boundary = /boundary=(?:"([^"]+)"|([^;]+))/.exec(contentType || '');
  if (!boundary) return null;
  const marker = Buffer.from(`--${boundary[1] || boundary[2]}`);
  let start = body.indexOf(marker);
  while (start !== -1) {
    const next = body.indexOf(marker, start + marker.length);
    if (next === -1) break;
    const part = body.subarray(start + marker.length, next);
    const headerEnd = part.indexOf('\r\n\r\n');
    if (headerEnd !== -1 && /name="transcript"/.test(part.subarray(0, headerEnd).toString())) {
      return part.subarray(headerEnd + 4, part.length - 2); // drop the trailing CRLF
    }
    start = next;
  }
  return null;
}

const transcriptImport = {
  name: 'demo-transcript-import',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      if (!req.url.startsWith('/api/v1/import_transcript/') || req.method !== 'POST') return next();
      const send = (status, payload) => {
        res.statusCode = status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(payload));
      };
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const pdf = uploadedFile(Buffer.concat(chunks), req.headers['content-type']);
      if (!pdf || pdf.length === 0) return send(400, { error: 'Choose your transcript PDF to upload.' });
      const classYear = Number(new URL(req.url, 'http://x').searchParams.get('year')) || 2027;
      const tmp = path.join(os.tmpdir(), `tp-demo-${process.pid}-${Date.now()}.pdf`);
      fs.writeFileSync(tmp, pdf);
      try {
        const out = execFileSync(PYTHON, [path.join(here, 'parse_transcript.py'), tmp, String(classYear)], {
          cwd: REPO,
          encoding: 'utf8',
        });
        const parsed = JSON.parse(out);
        if (parsed.error) return send(400, { error: parsed.error });
        const courses = [];
        const unmatched = [];
        for (const e of parsed.entries) {
          const course = DEMO_CATALOG[e.code];
          if (course) courses.push({ code: e.code, term: e.term, status: e.status, semesterIndex: e.semesterIndex, course });
          else unmatched.push(e.code);
        }
        return send(200, { classYear, courses, unmatched: [...new Set(unmatched)].sort() });
      } catch (error) {
        return send(500, { error: 'The demo could not run the transcript parser.' });
      } finally {
        fs.rmSync(tmp, { force: true });
      }
    });
  },
};

const server = await createServer({
  configFile: false,
  root: FRONTEND,
  plugins: [react(), previewPage, transcriptImport],
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
