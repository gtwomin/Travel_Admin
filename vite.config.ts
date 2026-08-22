import dayjs from "dayjs";
import { readFileSync } from "fs";
import { resolve } from "path";
import { ConfigEnv, defineConfig, loadEnv, UserConfig } from "vite";

import { wrapperEnv } from "./build/getEnv";
import { createVitePlugins } from "./build/plugins";
import { createProxy } from "./build/proxy";
import pkg from "./package.json";

const { dependencies, devDependencies, name, version } = pkg;
const __APP_INFO__ = {
  pkg: { dependencies, devDependencies, name, version },
  lastBuildTime: dayjs().format("YYYY-MM-DD HH:mm:ss")
};

// @see: https://vitejs.dev/config/
export default defineConfig(({ mode, command }: ConfigEnv): UserConfig => {
  const root = process.cwd();
  // Load non-VITE_ variables as well; HTTPS certificate paths must stay in the
  // Node/Vite config and must never be exposed to the client bundle.
  const env = loadEnv(mode, root, "");
  const viteEnv = wrapperEnv(env);
  // Keep certificate paths outside the client bundle while allowing local
  // development to load them from the ignored `.env.development.local` file.
  // Explicit process environment variables take precedence for CI/manual runs.
  const localHttpsCertPath = process.env.LOCAL_HTTPS_CERT_PATH ?? env.LOCAL_HTTPS_CERT_PATH;
  const localHttpsKeyPath = process.env.LOCAL_HTTPS_KEY_PATH ?? env.LOCAL_HTTPS_KEY_PATH;
  const isDevelopmentServer = command === "serve" && mode === "development";

  if (isDevelopmentServer && (!localHttpsCertPath || !localHttpsKeyPath)) {
    throw new Error(
      "Local HTTPS requires LOCAL_HTTPS_CERT_PATH and LOCAL_HTTPS_KEY_PATH to point to PEM files outside the repository."
    );
  }

  const localHttps =
    localHttpsCertPath && localHttpsKeyPath
      ? {
          cert: readFileSync(localHttpsCertPath),
          key: readFileSync(localHttpsKeyPath)
        }
      : undefined;

  return {
    base: viteEnv.VITE_PUBLIC_PATH,
    root,
    resolve: {
      alias: {
        "@": resolve(__dirname, "./src"),
        "vue-i18n": "vue-i18n/dist/vue-i18n.cjs.js"
      }
    },
    define: {
      __APP_INFO__: JSON.stringify(__APP_INFO__)
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "@/styles/var";`
        }
      }
    },
    server: {
      host: "localhost",
      port: viteEnv.VITE_PORT,
      strictPort: true,
      open: viteEnv.VITE_OPEN,
      cors: true,
      https: localHttps,
      // Load proxy configuration from .env.development
      proxy: createProxy(viteEnv.VITE_PROXY)
    },
    plugins: createVitePlugins(viteEnv),
    // esbuild: {
    //   pure: viteEnv.VITE_DROP_CONSOLE ? ["console.log", "debugger"] : []
    // },
    build: {
      outDir: "dist",
      minify: "esbuild",
      // esbuild 打包更快，但是不能去除 console.log，terser打包慢，但能去除 console.log
      // minify: "terser",
      // terserOptions: {
      // 	compress: {
      // 		drop_console: viteEnv.VITE_DROP_CONSOLE,
      // 		drop_debugger: true
      // 	}
      // },
      sourcemap: false,
      // 禁用 gzip 压缩大小报告，可略微减少打包时间
      reportCompressedSize: false,
      // 规定触发警告的 chunk 大小
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          // Static resource classification and packaging
          chunkFileNames: "assets/js/[name]-[hash].js",
          entryFileNames: "assets/js/[name]-[hash].js",
          assetFileNames: "assets/[ext]/[name]-[hash].[ext]"
        }
      }
    }
  };
});
