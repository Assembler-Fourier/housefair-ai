import "server-only";

export function isFreeLaunch() {
  return process.env.HOUSEFAIR_ACCESS_MODE !== "paid";
}

export function isLegacyPrivateAppEnabled() {
  return process.env.LEGACY_PRIVATE_APP_ENABLED === "true";
}

