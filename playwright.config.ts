import { defineConfig, devices } from "@playwright/test";

const live = process.env.E2E_LIVE === "1";
const devServer = {
  command: "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort",
  url: "http://127.0.0.1:5173",
  reuseExistingServer: live,
  timeout: 120_000,
};

export default defineConfig({
  testDir: "e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: live
    ? devServer
    : [
        {
          command: "npm run stub",
          url: "http://127.0.0.1:8080/api/policies",
          reuseExistingServer: false,
          timeout: 60_000,
        },
        devServer,
      ],
});
