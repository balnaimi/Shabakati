/** In-memory scan progress (per network id). */

const progressByNetwork = new Map()

export function startScanProgress(networkId, total) {
  progressByNetwork.set(networkId, {
    networkId,
    total,
    scanned: 0,
    found: 0,
    status: 'running',
    startedAt: new Date().toISOString(),
    finishedAt: null
  })
}

export function updateScanProgress(networkId, scanned, found) {
  const cur = progressByNetwork.get(networkId)
  if (!cur) return
  cur.scanned = scanned
  cur.found = found
}

export function finishScanProgress(networkId, found) {
  const cur = progressByNetwork.get(networkId)
  if (!cur) return
  cur.scanned = cur.total
  cur.found = found
  cur.status = 'done'
  cur.finishedAt = new Date().toISOString()
  setTimeout(() => progressByNetwork.delete(networkId), 60_000)
}

export function failScanProgress(networkId) {
  const cur = progressByNetwork.get(networkId)
  if (!cur) return
  cur.status = 'error'
  cur.finishedAt = new Date().toISOString()
  setTimeout(() => progressByNetwork.delete(networkId), 60_000)
}

export function getScanProgress(networkId) {
  return progressByNetwork.get(networkId) || null
}
