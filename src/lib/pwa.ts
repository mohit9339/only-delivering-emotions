/**
 * PWA bootstrap — registers /sw.js only on the published origin.
 *
 * Why so cautious? Lovable's editor preview renders inside an iframe; a service
 * worker registered there caches a stale shell that no future build can dislodge.
 * We therefore:
 *   1. Detect iframe / Lovable preview hosts and *unregister* any existing SW.
 *   2. Only register on standalone, non-preview origins.
 *   3. Use a NetworkFirst SW (see public/sw.js) so the production shell still
 *      revalidates on every navigation.
 */

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function isPreviewHost(): boolean {
  const h = window.location.hostname;
  return (
    h.includes("id-preview--") ||
    h.includes("lovableproject.com") ||
    h === "localhost" ||
    h === "127.0.0.1"
  );
}

export function registerPwa() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const unsafe = isInIframe() || isPreviewHost();
  if (unsafe) {
    // Clean up any SW left behind from a prior visit to the published origin.
    navigator.serviceWorker.getRegistrations().then((regs) => {
      regs.forEach((r) => r.unregister());
    });
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch((err) => console.warn("[pwa] register failed", err));
  });

  // Drain offline outbox when the SW asks us to.
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "FLUSH_OUTBOX") {
      window.dispatchEvent(new CustomEvent("only:flush-outbox"));
    }
  });
}
