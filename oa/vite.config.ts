import process from 'node:process';
import { URL, fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { setupVitePlugins } from './build/plugins';
import { createViteProxy, getBuildTime } from './build/config';

export default defineConfig(configEnv => {
  const viteEnv = loadEnv(configEnv.mode, process.cwd()) as unknown as Env.ImportMeta;

  const buildTime = getBuildTime();

  const enableProxy = configEnv.command === 'serve' && !configEnv.isPreview;
  const generatedProxy = createViteProxy(viteEnv, enableProxy) || {};
  // The Airway endpoints are provided by the local Express service. Do not use
  // VITE_SERVICE_BASE_URL here: test mode still points the template client at
  // Apifox, while these same-origin /api calls must always reach OA itself.
  const airwayApiTarget = process.env.AIRWAY_API_TARGET || 'http://127.0.0.1:3000';

  return {
    base: viteEnv.VITE_BASE_URL,
    resolve: {
      alias: {
        '~': fileURLToPath(new URL('./', import.meta.url)),
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler',
          additionalData: `@use "@/styles/scss/global.scss" as *;`
        }
      }
    },
    plugins: setupVitePlugins(viteEnv, buildTime),
    define: {
      BUILD_TIME: JSON.stringify(buildTime)
    },
    server: {
      allowedHosts: ['oa.example.com'],
      host: '0.0.0.0',
      port: 9528,
      strictPort: true,
      open: true,
      proxy: {
        ...generatedProxy,
        // Keep NovaKit on the OA HTTPS origin so it can be embedded safely.
        // NovaKit is mounted at /novakit/ and receives the path without the
        // prefix; its frontend adds the same prefix back to API requests.
        '/novakit': {
          target: process.env.NOVAKIT_UI_TARGET || 'http://127.0.0.1:8888',
          changeOrigin: true,
          rewrite: path => path.replace(/^\/novakit/, '') || '/'
        },
        // Airway modules use same-origin /api URLs. Keep them working in dev even
        // when the template's optional /proxy-default proxy is disabled.
        '/api': {
          target: airwayApiTarget,
          changeOrigin: true
        }
      }
    },
    preview: {
      port: 9725
    },
    build: {
      reportCompressedSize: false,
      sourcemap: viteEnv.VITE_SOURCE_MAP === 'Y',
      commonjsOptions: {
        ignoreTryCatch: false
      }
    }
  };
});
