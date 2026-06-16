import { readFileSync, existsSync } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'
import logger from './logger.js'

const execFileAsync = promisify(execFile)

/** Read Linux ARP table for an IP (works after ping on same host/network namespace). */
function macFromProcNetArp(ip) {
  if (!existsSync('/proc/net/arp')) return null
  try {
    const table = readFileSync('/proc/net/arp', 'utf8')
    for (const line of table.split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/)
      if (parts[0] === ip && parts[3] !== '00:00:00:00:00:00') {
        return parts[3]?.toUpperCase() || null
      }
    }
  } catch {
    /* optional */
  }
  return null
}

async function macFromIpNeigh(ip) {
  try {
    const { stdout } = await execFileAsync('ip', ['neigh', 'show', ip], { timeout: 2000 })
    const match = stdout.match(/([0-9a-f]{2}(?::[0-9a-f]{2}){5})/i)
    if (match && match[1].toUpperCase() !== '00:00:00:00:00:00') {
      return match[1].toUpperCase()
    }
  } catch {
    /* iproute2 may be unavailable */
  }
  return null
}

/** Resolve MAC for IP from local ARP/neighbor cache (best-effort). */
export async function resolveMacAddress(ip) {
  const fromProc = macFromProcNetArp(ip)
  if (fromProc) return fromProc
  const fromIp = await macFromIpNeigh(ip)
  if (fromIp) return fromIp
  return null
}

/** Batch-resolve MACs for many IPs (sequential to avoid shell spam). */
export async function resolveMacAddresses(ips) {
  const map = new Map()
  for (const ip of ips) {
    try {
      const mac = await resolveMacAddress(ip)
      if (mac) map.set(ip, mac)
    } catch (error) {
      logger.debug(`MAC lookup failed for ${ip}: ${error.message}`)
    }
  }
  return map
}
