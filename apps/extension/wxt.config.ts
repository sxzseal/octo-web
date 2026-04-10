import { defineConfig } from "wxt";
import tsconfigPaths from "vite-tsconfig-paths";
import commonjs from "vite-plugin-commonjs";
import path from "path";

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react", "@wxt-dev/auto-icons"],
  webExt: {
    disabled: true,
  },
  autoIcons: {
    developmentIndicator: "overlay",
  },
  vite: () => ({
    plugins: [commonjs(), tsconfigPaths({ root: "../../" })],
    resolve: {
      dedupe: ["react", "react-dom"],
      alias: {
        "@web": path.resolve(__dirname, "../web/src"),
      },
    },
    define: {
      "process.env.NODE_ENV": JSON.stringify("development"),
      "process.env.PUBLIC_URL": '""',
    },
  }),
  manifest: {
    side_panel: {
      default_path: "entrypoints/sidepanel/index.html",
    },
    permissions: [],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["/injected*.js"],
        matches: ["<all_urls>"],
      },
    ],
    action: {},
  },
});
