export const DAY_MS = 24 * 60 * 60 * 1000

export const AUTO_SCAN_INTERVAL_MS_OPTIONS = [5, 10, 15, 20, 30, 45, 60].map((m) => m * 60 * 1000)

export const OFFLINE_RELEASE_OPTIONS = [
  { ms: null, labelKey: 'pages.networkView.offlineReleaseNever' },
  { ms: 3 * DAY_MS, labelKey: 'pages.networkView.offlineRelease3d' },
  { ms: 7 * DAY_MS, labelKey: 'pages.networkView.offlineRelease7d' },
  { ms: 14 * DAY_MS, labelKey: 'pages.networkView.offlineRelease14d' },
  { ms: 30 * DAY_MS, labelKey: 'pages.networkView.offlineRelease30d' },
  { ms: 60 * DAY_MS, labelKey: 'pages.networkView.offlineRelease60d' },
  { ms: 90 * DAY_MS, labelKey: 'pages.networkView.offlineRelease90d' }
]

export const ALLOWED_OFFLINE_MS_SET = new Set(
  OFFLINE_RELEASE_OPTIONS.filter((o) => o.ms !== null).map((o) => o.ms)
)

export const HOST_PAGE_SIZE = 50
