"use client";

import { useEffect } from "react";

const STORAGE_KEY = "volohero-chunk-reload";
const RETRY_WINDOW_MS = 15000;

function isChunkLoadErrorMessage(message: string) {
  return /ChunkLoadError|Loading chunk [^ ]+ failed|Failed to fetch dynamically imported module/i.test(message);
}

function shouldReload() {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return true;
    }

    const lastReloadAt = Number.parseInt(raw, 10);
    if (!Number.isFinite(lastReloadAt)) {
      return true;
    }

    return Date.now() - lastReloadAt > RETRY_WINDOW_MS;
  } catch {
    return true;
  }
}

function markReload() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // ignore storage failures
  }
}

export default function ChunkLoadRecovery() {
  useEffect(() => {
    const reloadOnce = () => {
      if (!shouldReload()) {
        return;
      }

      markReload();
      window.location.reload();
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason instanceof Error
            ? reason.message
            : typeof reason?.message === "string"
              ? reason.message
              : "";

      if (!message || !isChunkLoadErrorMessage(message)) {
        return;
      }

      reloadOnce();
    };

    const handleError = (event: ErrorEvent) => {
      const message = event.message || (event.error instanceof Error ? event.error.message : "");
      if (!message || !isChunkLoadErrorMessage(message)) {
        return;
      }

      reloadOnce();
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
      window.removeEventListener("error", handleError);
    };
  }, []);

  return null;
}
