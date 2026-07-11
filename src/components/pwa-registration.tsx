"use client";

import * as React from "react";

export function PwaRegistration() {
  React.useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/sw.js", { scope: "/" });
  }, []);
  return null;
}

