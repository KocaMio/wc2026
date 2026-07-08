import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import matchHandler from './api/matches.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // 載入 .env 變數到 process.env 讓 api/matches.js 抓得到
  const env = loadEnv(mode, process.cwd(), '')
  process.env = { ...process.env, ...env }

  return {
    plugins: [
      react(),
      {
        name: 'vercel-api-middleware',
        configureServer(server) {
          server.middlewares.use('/api/matches', async (req, res, next) => {
            // Provide Express/Vercel-like res.status and res.json methods
            res.status = (code) => {
              res.statusCode = code;
              return res;
            };
            res.json = (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            };
            
            try {
              await matchHandler(req, res);
            } catch (e) {
              console.error(e);
              next(e);
            }
          });
        }
      }
    ],
  };
})
