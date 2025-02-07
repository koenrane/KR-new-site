import { CustomProjectConfig } from "lost-pixel"

export const config: CustomProjectConfig = {
  pageShots: {
    pages: [{ path: "/", name: "welcome" }],
    baseUrl: "http://localhost:8080",
  },
  lostPixelProjectId: "cm6veg48v0r6per0f9tis4zuy",
  apiKey: process.env.LOST_PIXEL_API_KEY,
}
