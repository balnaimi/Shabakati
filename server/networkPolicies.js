/** Allowed auto-scan intervals (ms): 5 min … 60 min */
export const ALLOWED_AUTO_SCAN_INTERVAL_MS = [
  5, 10, 15, 20, 30, 45, 60
].map((m) => m * 60 * 1000);

export const ALLOWED_AUTO_SCAN_INTERVAL_SET = new Set(ALLOWED_AUTO_SCAN_INTERVAL_MS);

const DAY_MS = 24 * 60 * 60 * 1000;

/** Allowed durations before an offline host is removed so its IP becomes available again */
export const ALLOWED_OFFLINE_RELEASE_MS = [
  3 * DAY_MS,
  7 * DAY_MS,
  14 * DAY_MS,
  30 * DAY_MS,
  60 * DAY_MS,
  90 * DAY_MS
];

export const ALLOWED_OFFLINE_RELEASE_SET = new Set(ALLOWED_OFFLINE_RELEASE_MS);
