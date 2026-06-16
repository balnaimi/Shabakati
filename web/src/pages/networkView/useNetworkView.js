import { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { apiGet, apiPost, apiDelete, apiPut } from '../../utils/api'
import { calculateIPRange, isValidIP, isIPInInclusiveRange } from '../../utils/networkUtils'
import { useAuth } from '../../contexts/AuthContext'
import { useTags } from '../../hooks/useTags'
import { useTranslation } from '../../hooks/useTranslation'
import { useLanguage } from '../../contexts/LanguageContext'
import { useToast } from '../../components/Toast'
import { useConfirmDialog } from '../../hooks/useConfirmDialog'
import { formatClientError, toastApiError } from '../../utils/formatClientError'
import {
  AUTO_SCAN_INTERVAL_MS_OPTIONS,
  ALLOWED_OFFLINE_MS_SET,
  HOST_PAGE_SIZE
} from './constants'
import { filterAndSortHosts } from './utils'

export function useNetworkView() {
  const { id } = useParams()
  const { isAdmin, userType } = useAuth()
  const [network, setNetwork] = useState(null)
  const [hosts, setHosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(null)
  const [historyHost, setHistoryHost] = useState(null)
  const [tablePage, setTablePage] = useState(1)
  const [error, setError] = useState(null)
  const [ipRange, setIpRange] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tagFilter, setTagFilter] = useState(null)
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const { tags: availableTags } = useTags()
  const { t } = useTranslation()
  const { language, isRTL } = useLanguage()
  const toast = useToast()
  const { confirm, confirmDialogSlot } = useConfirmDialog()
  const [editingHostId, setEditingHostId] = useState(null)
  const [editFormData, setEditFormData] = useState({ tagIds: [] })
  const [activeTab, setActiveTab] = useState('devices')
  const [favorites, setFavorites] = useState([])
  const [newHosts, setNewHosts] = useState([])
  const [hiddenNewHosts, setHiddenNewHosts] = useState(new Set())
  const [autoScanEnabled, setAutoScanEnabled] = useState(false)
  const [autoScanInterval, setAutoScanInterval] = useState(300000)
  const [autoScanResults, setAutoScanResults] = useState({ newDevices: [], disconnected: [] })
  const [loadingAutoScan, setLoadingAutoScan] = useState(false)
  const [scanUsePing, setScanUsePing] = useState(true)
  const [scanUseTcp, setScanUseTcp] = useState(true)
  const [savingScanPrefs, setSavingScanPrefs] = useState(false)
  const [selectedHostIds, setSelectedHostIds] = useState([])
  const [bulkEditingIds, setBulkEditingIds] = useState(null)
  const [bulkWorking, setBulkWorking] = useState(false)
  const [scanResultModal, setScanResultModal] = useState(null)
  const [manualNewHostsExpanded, setManualNewHostsExpanded] = useState(false)
  const [autoNewDevicesExpanded, setAutoNewDevicesExpanded] = useState(false)
  const [disconnectedExpanded, setDisconnectedExpanded] = useState(false)
  const [offlineReleaseAfterMs, setOfflineReleaseAfterMs] = useState(null)
  const [networkInfoExpanded, setNetworkInfoExpanded] = useState(false)
  const [scanMethodExpanded, setScanMethodExpanded] = useState(false)

  const fetchFavorites = useCallback(async () => {
    try {
      const data = await apiGet('/favorites')
      setFavorites(data)
    } catch (err) {
      console.error('Error fetching favorites:', err)
    }
  }, [])

  const fetchAutoScanResults = useCallback(async () => {
    try {
      const newDevices = await apiGet(`/networks/${id}/auto-scan-results?type=new_device`)
      const disconnected = await apiGet(`/networks/${id}/auto-scan-results?type=disconnected`)
      setAutoScanResults({
        newDevices: newDevices.filter(r => r.host),
        disconnected: disconnected.filter(r => r.host)
      })
    } catch (err) {
      console.error('Error fetching auto scan results:', err)
    }
  }, [id])

  const fetchNetwork = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await apiGet(`/networks/${id}`)
      setNetwork(data)

      if (data) {
        const range = calculateIPRange(data.network_id, data.subnet)
        setIpRange(range)
      }
    } catch (err) {
      setError(formatClientError(err, t))
    } finally {
      setLoading(false)
    }
  }, [id, t])

  const fetchHosts = useCallback(async () => {
    try {
      const data = await apiGet(`/networks/${id}/hosts`)
      setHosts(data)
    } catch (err) {
      console.error('Error fetching hosts:', err)
    }
  }, [id])

  useEffect(() => {
    fetchNetwork()
    fetchHosts()
    fetchFavorites()
  }, [fetchNetwork, fetchHosts, fetchFavorites])

  useEffect(() => {
    if (network) {
      setAutoScanEnabled(network.auto_scan_enabled === 1)
      const rawInterval = network.auto_scan_interval || 300000
      setAutoScanInterval(
        AUTO_SCAN_INTERVAL_MS_OPTIONS.includes(rawInterval) ? rawInterval : 300000
      )
      const orv = network.offline_release_after_ms
      const parsed =
        orv === undefined || orv === null ? null : Number(orv)
      setOfflineReleaseAfterMs(parsed !== null && ALLOWED_OFFLINE_MS_SET.has(parsed) ? parsed : null)
      setScanUsePing((network.scan_use_ping ?? 1) === 1)
      setScanUseTcp((network.scan_use_tcp ?? 1) === 1)
      fetchAutoScanResults()
    }
  }, [network, fetchAutoScanResults])

  useEffect(() => {
    setSelectedHostIds([])
  }, [searchQuery, statusFilter, tagFilter])

  useEffect(() => {
    setSelectedHostIds([])
    setManualNewHostsExpanded(false)
    setAutoNewDevicesExpanded(false)
    setDisconnectedExpanded(false)
    setNetworkInfoExpanded(false)
    setScanMethodExpanded(false)
  }, [id])

  const isHostFavorite = (hostId) => favorites.some(fav => fav.hostId === hostId)

  const handleAddToFavorites = async (hostId) => {
    try {
      await apiPost('/favorites', { hostId: parseInt(hostId) })
      await fetchFavorites()
      toast.success(t('messages.success.addedToFavorites'))
    } catch (err) {
      toastApiError(toast, t, err)
    }
  }

  const handleRemoveFromFavorites = async (hostId) => {
    try {
      const favorite = favorites.find(fav => fav.hostId === hostId)
      if (favorite) {
        await apiDelete(`/favorites/${favorite.id}`)
        await fetchFavorites()
        toast.success(t('messages.success.removedFromFavorites'))
      }
    } catch (err) {
      toastApiError(toast, t, err)
    }
  }

  const handleHideNewHost = (hostId) => {
    setHiddenNewHosts(prev => new Set([...prev, hostId]))
  }

  const handleHideAllNewHosts = () => {
    setHiddenNewHosts(new Set(newHosts.map(h => h.id)))
  }

  const visibleNewHosts = newHosts.filter(host => !hiddenNewHosts.has(host.id))

  const handleToggleAutoScan = async () => {
    try {
      setLoadingAutoScan(true)
      const newState = !autoScanEnabled
      const result = await apiPost(`/networks/${id}/auto-scan`, {
        enabled: newState,
        interval: autoScanInterval
      })
      setAutoScanEnabled(newState)
      setNetwork(result)
      toast.success(newState ? t('pages.networkView.autoScanEnabled') : t('pages.networkView.autoScanDisabled'))
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setLoadingAutoScan(false)
    }
  }

  const handleAutoScanIntervalChange = async (ms) => {
    setAutoScanInterval(ms)
    if (!network || !isAdmin) return
    try {
      setLoadingAutoScan(true)
      await apiPost(`/networks/${id}/auto-scan`, {
        enabled: autoScanEnabled,
        interval: ms
      })
      await fetchNetwork()
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setLoadingAutoScan(false)
    }
  }

  const handleSaveScanPreferences = async () => {
    if (!network || !isAdmin) return
    if (!scanUsePing && !scanUseTcp) {
      toast.warning(t('pages.networkView.scanNeedOneMethod'))
      return
    }
    try {
      setSavingScanPrefs(true)
      await apiPut(`/networks/${id}`, {
        name: network.name,
        networkId: network.network_id,
        subnet: network.subnet,
        scan_use_ping: scanUsePing,
        scan_use_tcp: scanUseTcp,
        offline_release_after_ms: offlineReleaseAfterMs,
        dhcp_range_start: network.dhcp_range_start ?? null,
        dhcp_range_end: network.dhcp_range_end ?? null
      })
      await fetchNetwork()
      toast.success(t('pages.networkView.scanPreferencesSaved'))
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setSavingScanPrefs(false)
    }
  }

  const handleScan = async () => {
    if (!scanUsePing && !scanUseTcp) {
      toast.warning(t('pages.networkView.scanNeedOneMethod'))
      return
    }
    let poll = null
    try {
      setError(null)
      setScanning(true)
      setScanProgress({ status: 'running', scanned: 0, total: 0, found: 0 })

      poll = setInterval(async () => {
        try {
          const p = await apiGet(`/networks/${id}/scan/progress`)
          setScanProgress(p)
          if (p.status === 'done' || p.status === 'error' || p.status === 'idle') {
            clearInterval(poll)
            poll = null
          }
        } catch {
          /* ignore poll errors */
        }
      }, 600)

      const hostsBeforeScan = [...hosts]
      const existingIPs = new Set(hostsBeforeScan.map(h => h.ip))

      const result = await apiPost(`/networks/${id}/scan`, {
        timeout: 2,
        addHosts: true,
        language: language,
        usePing: scanUsePing,
        useTcpPorts: scanUseTcp
      })

      await new Promise(resolve => setTimeout(resolve, 500))

      await fetchNetwork()
      const updatedHosts = await apiGet(`/networks/${id}/hosts`)
      setHosts(updatedHosts)

      await fetchAutoScanResults()

      if (result.addedCount > 0) {
        const newHostsList = updatedHosts.filter(host => !existingIPs.has(host.ip))
        if (newHostsList.length > 0) {
          setNewHosts(newHostsList)
          setHiddenNewHosts(new Set())
        }
      }

      if (result.hosts && result.hosts.length > 0) {
        const addedCount = result.addedCount ?? result.hosts.length
        const ds = result.detectionSummary
        const paragraphs = [
          t('pages.networkView.scanResult', { total: result.hosts.length, added: addedCount })
        ]
        if (ds) {
          paragraphs.push(
            t('pages.networkView.detectionSummaryLine', {
              ping: ds.ping,
              port: ds.port,
              both: ds.both
            })
          )
        }
        setScanResultModal({
          title: t('pages.networkView.scanResultModalTitle'),
          paragraphs
        })
      } else {
        setScanResultModal({
          title: t('pages.networkView.scanResultModalTitle'),
          paragraphs: [t('pages.networkView.scanResultNoDevices')]
        })
      }
    } catch (err) {
      console.error('Scan error:', err)
      setError(formatClientError(err, t))
      toastApiError(toast, t, err)
    } finally {
      if (poll) clearInterval(poll)
      setScanning(false)
    }
  }

  const handleClearNetworkHosts = async () => {
    const ok = await confirm({
      title: t('common.confirm'),
      message: t('messages.confirm.clearAllHosts'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      confirmClassName: 'btn-danger'
    })
    if (!ok) return

    try {
      setError(null)
      const result = await apiDelete(`/networks/${id}/hosts`)
      await fetchHosts()
      await fetchNetwork()
      toast.success(result.message || t('messages.success.hostsDeleted'))
    } catch (err) {
      setError(formatClientError(err, t))
    }
  }

  const handleDeleteHost = async (hostId) => {
    const ok = await confirm({
      title: t('common.confirm'),
      message: t('messages.confirm.deleteHost'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      confirmClassName: 'btn-danger'
    })
    if (!ok) return

    try {
      setError(null)
      await apiDelete(`/hosts/${hostId}`)
      await fetchHosts()
      await fetchNetwork()
      setSelectedHostIds((prev) => prev.filter((hid) => hid !== hostId))
    } catch (err) {
      setError(formatClientError(err, t))
    }
  }

  const handleEditHost = (host) => {
    setBulkEditingIds(null)
    setEditingHostId(host.id)
    const tagIds = host.tags && Array.isArray(host.tags)
      ? host.tags.map(tag => typeof tag === 'object' ? tag.id : tag)
      : []
    setEditFormData({ tagIds })
  }

  const handleCancelEdit = () => {
    setEditingHostId(null)
    setBulkEditingIds(null)
    setEditFormData({ tagIds: [] })
  }

  const handleUpdateHost = async (e) => {
    e.preventDefault()

    try {
      setError(null)

      if (bulkEditingIds && bulkEditingIds.length > 0) {
        await apiPut('/hosts/bulk-tags', {
          ids: bulkEditingIds,
          tagIds: editFormData.tagIds
        })
        await fetchHosts()
        handleCancelEdit()
        setSelectedHostIds([])
        toast.success(t('pages.networkView.bulkTagsSuccess', { count: bulkEditingIds.length }))
        return
      }

      if (!editingHostId) return

      const host = hosts.find(h => h.id === editingHostId)
      if (!host) return

      await apiPut(`/hosts/${editingHostId}`, {
        name: host.name,
        ip: host.ip,
        description: host.description || '',
        url: host.url || '',
        status: host.status,
        tagIds: editFormData.tagIds
      })

      await fetchHosts()
      handleCancelEdit()
    } catch (err) {
      setError(formatClientError(err, t))
    }
  }

  const toggleHostSelected = (hostId) => {
    setSelectedHostIds((prev) =>
      prev.includes(hostId) ? prev.filter((hid) => hid !== hostId) : [...prev, hostId]
    )
  }

  const handleBulkDelete = async () => {
    if (!isAdmin || selectedHostIds.length === 0) return
    const ok = await confirm({
      title: t('common.confirm'),
      message: t('pages.networkView.bulkDeleteConfirm', { count: selectedHostIds.length }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      confirmClassName: 'btn-danger'
    })
    if (!ok) return
    try {
      setBulkWorking(true)
      setError(null)
      await apiPost(`/networks/${id}/hosts/bulk-delete`, { ids: selectedHostIds })
      await fetchHosts()
      await fetchNetwork()
      setSelectedHostIds([])
      toast.success(t('pages.networkView.bulkDeleteSuccess'))
    } catch (err) {
      setError(formatClientError(err, t))
      toastApiError(toast, t, err)
    } finally {
      setBulkWorking(false)
    }
  }

  const handleBulkFavoritesAdd = async () => {
    if (selectedHostIds.length === 0) return
    try {
      setBulkWorking(true)
      const result = await apiPost('/favorites/bulk', { hostIds: selectedHostIds, action: 'add' })
      await fetchFavorites()
      toast.success(t('pages.networkView.bulkFavoritesAddResult', { affected: result.affected, skipped: result.skipped }))
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setBulkWorking(false)
    }
  }

  const handleBulkFavoritesRemove = async () => {
    if (selectedHostIds.length === 0) return
    try {
      setBulkWorking(true)
      const result = await apiPost('/favorites/bulk', { hostIds: selectedHostIds, action: 'remove' })
      await fetchFavorites()
      toast.success(t('pages.networkView.bulkFavoritesRemoveResult', { affected: result.affected, skipped: result.skipped }))
    } catch (err) {
      toastApiError(toast, t, err)
    } finally {
      setBulkWorking(false)
    }
  }

  const handleOpenBulkEditTags = () => {
    if (!isAdmin || selectedHostIds.length === 0) return
    setEditingHostId(null)
    setBulkEditingIds([...selectedHostIds])
    setEditFormData({ tagIds: [] })
  }

  const filteredHosts = useMemo(
    () => filterAndSortHosts(hosts, { searchQuery, statusFilter, tagFilter, sortBy, sortOrder }),
    [hosts, searchQuery, statusFilter, tagFilter, sortBy, sortOrder]
  )

  useEffect(() => {
    setTablePage(1)
  }, [searchQuery, statusFilter, tagFilter, sortBy, sortOrder])

  const totalTablePages = Math.max(1, Math.ceil(filteredHosts.length / HOST_PAGE_SIZE))
  const paginatedHosts = useMemo(() => {
    const start = (tablePage - 1) * HOST_PAGE_SIZE
    return filteredHosts.slice(start, start + HOST_PAGE_SIZE)
  }, [filteredHosts, tablePage])

  const toggleSelectAllFiltered = () => {
    const fids = filteredHosts.map((h) => h.id)
    const allOn = fids.length > 0 && fids.every((hid) => selectedHostIds.includes(hid))
    if (allOn) {
      setSelectedHostIds((prev) => prev.filter((hid) => !fids.includes(hid)))
    } else {
      setSelectedHostIds((prev) => [...new Set([...prev, ...fids])])
    }
  }

  const selectOfflineFiltered = () => {
    setSelectedHostIds(filteredHosts.filter((h) => h.status === 'offline').map((h) => h.id))
  }

  const handleSortChange = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('asc')
    }
  }

  const getIPStatus = (ip) => {
    const host = hosts.find(h => h.ip === ip)
    if (!host) return 'empty'
    return host.status === 'online' ? 'online' : 'offline'
  }

  const handleClearAutoNewDevices = async () => {
    try {
      await apiDelete(`/networks/${id}/auto-scan-results?type=new_device`)
      await fetchAutoScanResults()
    } catch (err) {
      toastApiError(toast, t, err)
    }
  }

  const handleClearDisconnected = async () => {
    try {
      await apiDelete(`/networks/${id}/auto-scan-results?type=disconnected`)
      await fetchAutoScanResults()
    } catch (err) {
      toastApiError(toast, t, err)
    }
  }

  const range = network
    ? (ipRange || calculateIPRange(network.network_id, network.subnet))
    : null
  const displayRange = range?.range?.length > 0 ? range.range : []
  const dhcpRangeStart = network?.dhcp_range_start?.trim?.() || null
  const dhcpRangeEnd = network?.dhcp_range_end?.trim?.() || null
  const hasDhcpRange = Boolean(
    dhcpRangeStart &&
      dhcpRangeEnd &&
      isValidIP(dhcpRangeStart) &&
      isValidIP(dhcpRangeEnd) &&
      isIPInInclusiveRange(dhcpRangeStart, dhcpRangeStart, dhcpRangeEnd) &&
      isIPInInclusiveRange(dhcpRangeEnd, dhcpRangeStart, dhcpRangeEnd)
  )

  return {
    isAdmin,
    userType,
    network,
    hosts,
    loading,
    scanning,
    scanProgress,
    historyHost,
    setHistoryHost,
    tablePage,
    setTablePage,
    error,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    tagFilter,
    setTagFilter,
    sortBy,
    sortOrder,
    availableTags,
    t,
    language,
    isRTL,
    toast,
    confirmDialogSlot,
    editingHostId,
    editFormData,
    setEditFormData,
    activeTab,
    setActiveTab,
    autoScanEnabled,
    autoScanInterval,
    autoScanResults,
    loadingAutoScan,
    scanUsePing,
    setScanUsePing,
    scanUseTcp,
    setScanUseTcp,
    savingScanPrefs,
    selectedHostIds,
    setSelectedHostIds,
    bulkEditingIds,
    bulkWorking,
    scanResultModal,
    setScanResultModal,
    manualNewHostsExpanded,
    setManualNewHostsExpanded,
    autoNewDevicesExpanded,
    setAutoNewDevicesExpanded,
    disconnectedExpanded,
    setDisconnectedExpanded,
    offlineReleaseAfterMs,
    setOfflineReleaseAfterMs,
    networkInfoExpanded,
    setNetworkInfoExpanded,
    scanMethodExpanded,
    setScanMethodExpanded,
    visibleNewHosts,
    filteredHosts,
    paginatedHosts,
    totalTablePages,
    range,
    displayRange,
    hasDhcpRange,
    dhcpRangeStart,
    dhcpRangeEnd,
    isHostFavorite,
    handleAddToFavorites,
    handleRemoveFromFavorites,
    handleHideNewHost,
    handleHideAllNewHosts,
    handleToggleAutoScan,
    handleAutoScanIntervalChange,
    handleSaveScanPreferences,
    handleScan,
    handleClearNetworkHosts,
    handleDeleteHost,
    handleEditHost,
    handleCancelEdit,
    handleUpdateHost,
    toggleHostSelected,
    handleBulkDelete,
    handleBulkFavoritesAdd,
    handleBulkFavoritesRemove,
    handleOpenBulkEditTags,
    toggleSelectAllFiltered,
    selectOfflineFiltered,
    handleSortChange,
    getIPStatus,
    handleClearAutoNewDevices,
    handleClearDisconnected
  }
}
