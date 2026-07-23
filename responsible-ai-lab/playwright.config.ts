import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:5173",
    trace: "on-first-retry"
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : [
        {
          command: "npm run dev -w @responsible-ai-lab/server",
          url: "http://localhost:4000/health",
          reuseExistingServer: true,
          timeout: 120_000
        },
        {
          command: "npm run dev -w @responsible-ai-lab/web",
          url: "http://localhost:5173",
          reuseExistingServer: true,
          timeout: 120_000
        }
      ],
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    {
      name: "tablet",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 834, height: 1194 },
        isMobile: false,
        hasTouch: true
      }
    }
  ]
});
