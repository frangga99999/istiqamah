// Prefix for absolute asset URLs that Next does NOT rewrite for basePath
// (raw <img src>, the service worker, manifest/icon metadata). Empty locally,
// "/istiqamah" on GitHub Pages (inlined at build via NEXT_PUBLIC_BASE_PATH).
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string): string {
  return `${BASE_PATH}${path}`;
}
