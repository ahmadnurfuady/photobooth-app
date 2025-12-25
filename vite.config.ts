import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { sentryVitePlugin } from "@sentry/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      // Plugin ini akan mengupload source maps ke Sentry saat build production
      sentryVitePlugin({
        org: "NAMA_ORGANISASI_SENTRY_ANDA",
        project: "NAMA_PROJECT_SENTRY_ANDA",
        authToken: process.env.SENTRY_AUTH_TOKEN, // Set ini di .env lokal atau CI/CD
      }),
    ],
    build: {
      sourcemap: true, // Wajib TRUE agar source maps tergenerate
    },
  };
});