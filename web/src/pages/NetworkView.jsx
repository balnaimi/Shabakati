import { useNavigate } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import EmptyState from '../components/EmptyState'
import HostHistoryModal from '../components/HostHistoryModal'
import Modal from '../components/Modal'
import { DeviceIcon, AlertIcon } from '../components/Icons'
import { useNetworkView } from './networkView/useNetworkView'
import NetworkInfoCard from './networkView/NetworkInfoCard'
import ScanMethodCard from './networkView/ScanMethodCard'
import ScanToolbar from './networkView/ScanToolbar'
import DiscoveryPanels from './networkView/DiscoveryPanels'
import HostsTableSection from './networkView/HostsTableSection'
import IpAddressGrid from './networkView/IpAddressGrid'

function NetworkView() {
  const navigate = useNavigate()
  const nv = useNetworkView()

  if (nv.loading) {
    return <LoadingSpinner fullPage />
  }

  if (!nv.network) {
    return (
      <div className="container">
        <EmptyState
          icon="network"
          title={nv.t('pages.networkView.title')}
          action={() => navigate('/networks')}
          actionLabel={nv.t('common.back')}
        />
      </div>
    )
  }

  return (
    <div className="container">
      <div className="header">
        <h1>{nv.network.name}</h1>
      </div>

      <NetworkInfoCard
        network={nv.network}
        networkInfoExpanded={nv.networkInfoExpanded}
        onToggleExpanded={() => nv.setNetworkInfoExpanded((v) => !v)}
        range={nv.range}
        hasDhcpRange={nv.hasDhcpRange}
        dhcpRangeStart={nv.dhcpRangeStart}
        dhcpRangeEnd={nv.dhcpRangeEnd}
        isRTL={nv.isRTL}
        t={nv.t}
      />

      {nv.isAdmin && (
        <ScanMethodCard
          scanMethodExpanded={nv.scanMethodExpanded}
          onToggleExpanded={() => nv.setScanMethodExpanded((v) => !v)}
          scanUsePing={nv.scanUsePing}
          onScanUsePingChange={nv.setScanUsePing}
          scanUseTcp={nv.scanUseTcp}
          onScanUseTcpChange={nv.setScanUseTcp}
          offlineReleaseAfterMs={nv.offlineReleaseAfterMs}
          onOfflineReleaseAfterMsChange={nv.setOfflineReleaseAfterMs}
          savingScanPrefs={nv.savingScanPrefs}
          onSaveScanPreferences={nv.handleSaveScanPreferences}
          t={nv.t}
        />
      )}

      {nv.error && (
        <div className="error-message">
          <AlertIcon size={18} />
          <span>{nv.error}</span>
        </div>
      )}

      {nv.isAdmin && (
        <ScanToolbar
          scanning={nv.scanning}
          scanProgress={nv.scanProgress}
          scanUsePing={nv.scanUsePing}
          scanUseTcp={nv.scanUseTcp}
          onScan={nv.handleScan}
          autoScanEnabled={nv.autoScanEnabled}
          autoScanInterval={nv.autoScanInterval}
          loadingAutoScan={nv.loadingAutoScan}
          onToggleAutoScan={nv.handleToggleAutoScan}
          onAutoScanIntervalChange={nv.handleAutoScanIntervalChange}
          onClearNetworkHosts={nv.handleClearNetworkHosts}
          t={nv.t}
        />
      )}

      <div className="tabs" style={{ marginBlockStart: 'var(--spacing-lg)' }}>
        <button
          onClick={() => nv.setActiveTab('devices')}
          className={`tab ${nv.activeTab === 'devices' ? 'active' : ''}`}
        >
          <DeviceIcon size={16} />
          <span>{nv.t('pages.networkView.devices')}</span>
        </button>
        <button
          onClick={() => nv.setActiveTab('ips')}
          className={`tab ${nv.activeTab === 'ips' ? 'active' : ''}`}
        >
          <span>{nv.t('pages.networkView.ipAddresses')}</span>
        </button>
      </div>

      {nv.activeTab === 'devices' && (
        <>
          <DiscoveryPanels
            visibleNewHosts={nv.visibleNewHosts}
            manualNewHostsExpanded={nv.manualNewHostsExpanded}
            onToggleManualNewHosts={() => nv.setManualNewHostsExpanded((v) => !v)}
            onHideAllNewHosts={nv.handleHideAllNewHosts}
            onHideNewHost={nv.handleHideNewHost}
            onEditHost={nv.handleEditHost}
            autoScanResults={nv.autoScanResults}
            autoNewDevicesExpanded={nv.autoNewDevicesExpanded}
            onToggleAutoNewDevices={() => nv.setAutoNewDevicesExpanded((v) => !v)}
            onClearAutoNewDevices={nv.handleClearAutoNewDevices}
            disconnectedExpanded={nv.disconnectedExpanded}
            onToggleDisconnected={() => nv.setDisconnectedExpanded((v) => !v)}
            onClearDisconnected={nv.handleClearDisconnected}
            isAdmin={nv.isAdmin}
            language={nv.language}
            t={nv.t}
          />

          <HostsTableSection
            hosts={nv.hosts}
            filteredHosts={nv.filteredHosts}
            paginatedHosts={nv.paginatedHosts}
            totalTablePages={nv.totalTablePages}
            tablePage={nv.tablePage}
            onTablePageChange={nv.setTablePage}
            searchQuery={nv.searchQuery}
            onSearchQueryChange={nv.setSearchQuery}
            statusFilter={nv.statusFilter}
            onStatusFilterChange={nv.setStatusFilter}
            tagFilter={nv.tagFilter}
            onTagFilterChange={nv.setTagFilter}
            availableTags={nv.availableTags}
            sortBy={nv.sortBy}
            sortOrder={nv.sortOrder}
            onSortChange={nv.handleSortChange}
            selectedHostIds={nv.selectedHostIds}
            onToggleHostSelected={nv.toggleHostSelected}
            onToggleSelectAllFiltered={nv.toggleSelectAllFiltered}
            onSelectOfflineFiltered={nv.selectOfflineFiltered}
            onBulkFavoritesAdd={nv.handleBulkFavoritesAdd}
            onBulkFavoritesRemove={nv.handleBulkFavoritesRemove}
            onOpenBulkEditTags={nv.handleOpenBulkEditTags}
            onBulkDelete={nv.handleBulkDelete}
            onClearSelection={() => nv.setSelectedHostIds([])}
            bulkWorking={nv.bulkWorking}
            isAdmin={nv.isAdmin}
            userType={nv.userType}
            isHostFavorite={nv.isHostFavorite}
            onAddToFavorites={nv.handleAddToFavorites}
            onRemoveFromFavorites={nv.handleRemoveFromFavorites}
            onEditHost={nv.handleEditHost}
            onDeleteHost={nv.handleDeleteHost}
            onViewHistory={nv.setHistoryHost}
            editingHostId={nv.editingHostId}
            bulkEditingIds={nv.bulkEditingIds}
            editFormData={nv.editFormData}
            onEditFormDataChange={nv.setEditFormData}
            onUpdateHost={nv.handleUpdateHost}
            onCancelEdit={nv.handleCancelEdit}
            language={nv.language}
            t={nv.t}
          />

          {nv.hosts.length === 0 && (
            <EmptyState
              icon="device"
              title={nv.t('pages.networkView.noHosts')}
              description={nv.t('pages.networkView.scanToAdd')}
              action={nv.isAdmin ? nv.handleScan : null}
              actionLabel={nv.t('pages.networkView.scan')}
            />
          )}
        </>
      )}

      {nv.activeTab === 'ips' && (
        <IpAddressGrid
          network={nv.network}
          range={nv.range}
          displayRange={nv.displayRange}
          hosts={nv.hosts}
          hasDhcpRange={nv.hasDhcpRange}
          dhcpRangeStart={nv.dhcpRangeStart}
          dhcpRangeEnd={nv.dhcpRangeEnd}
          getIPStatus={nv.getIPStatus}
          toast={nv.toast}
          t={nv.t}
        />
      )}

      <Modal
        isOpen={nv.scanResultModal !== null}
        onClose={() => nv.setScanResultModal(null)}
        title={nv.scanResultModal?.title}
        size="small"
        closeOnOverlay={false}
        showCloseButton={false}
        footer={
          <button type="button" className="btn-primary" onClick={() => nv.setScanResultModal(null)}>
            {nv.t('common.ok')}
          </button>
        }
      >
        {nv.scanResultModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            {nv.scanResultModal.paragraphs.map((line, idx) => (
              <p
                key={idx}
                style={{
                  margin: 0,
                  color: idx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)',
                  fontWeight: idx === 0 ? 'var(--font-weight-medium)' : undefined,
                  lineHeight: 1.55
                }}
              >
                {line}
              </p>
            ))}
          </div>
        )}
      </Modal>
      {nv.confirmDialogSlot}
      {nv.historyHost && (
        <HostHistoryModal host={nv.historyHost} onClose={() => nv.setHistoryHost(null)} />
      )}
    </div>
  )
}

export default NetworkView
