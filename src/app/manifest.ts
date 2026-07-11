import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HouseFair",
    short_name: "HouseFair",
    description:
      "Fair chores, groceries, house issues, shared money, and AI planning for roommates.",
    start_url: "/app/today",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f7f6ef",
    theme_color: "#247b78",
    categories: ["productivity", "utilities", "lifestyle"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-180.png",
        sizes: "180x180",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Today",
        short_name: "Task",
        description: "Open the HouseFair command center",
        url: "/app/today",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
      {
        name: "Add Grocery",
        short_name: "Grocery",
        description: "Open grocery manager",
        url: "/app/groceries",
        icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
      },
    ],
    screenshots: [
      {
        src: "/house-plan.svg",
        sizes: "1200x900",
        type: "image/svg+xml",
        form_factor: "wide",
      },
      {
        src: "/splash.svg",
        sizes: "1200x1800",
        type: "image/svg+xml",
        form_factor: "narrow",
      },
    ],
  };
}
