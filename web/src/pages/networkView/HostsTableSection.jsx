import IpAddress from '../../components/IpAddress'
import { getHostDisplayName } from '../../utils/hostDisplay'
import {
  OnlineIcon,
  OfflineIcon,
  EditIcon,
  DeleteIcon,
  StarIcon,
  ChartIcon,
  CloseIcon
} from '../../components/Icons'
import { HOST_PAGE_SIZE } from './constants'
import { formatDateTime } from '../../utils/dateFormat'
import DeviceSummaryCell from '../../components/DeviceSummaryCell'

export default function HostsTableSection({
  hosts,
  filteredHosts,
  paginatedHosts,
  totalTablePages,
  tablePage,
  onTablePageChange,
  searchQuery,
  onSearchQueryChange,
  statusFilter,
  onStatusFilterChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  sortBy,
  sortOrder,
  onSortChange,
  selectedHostIds,
  onToggleHostSelected,
  onToggleSelectAllFiltered,
  onSelectOfflineFiltered,
  onBulkFavoritesAdd,
  onBulkFavoritesRemove,
  onOpenBulkEditTags,
  onBulkDelete,
  onClearSelection,
  bulkWorking,
  isAdmin,
  userType,
  isHostFavorite,
  onAddToFavorites,
  onRemoveFromFavorites,
  onEditHost,
  onDeleteHost,
  onViewHistory,
  editingHostId,
  bulkEditingIds,
  editFormData,
  onEditFormDataChange,
  onUpdateHost,
  onCancelEdit,
  language,
  t
}) {
  const editingHost = hosts.find(h => h.id === editingHostId)

  return (
    <>
      {hosts.length > 0 && (
        <div style={{ marginBlockStart: 'var(--spacing-xl)' }}>
          <h2 style={{ marginBlockEnd: 'var(--spacing-md)', fontSize: 'var(--font-size-lg)' }}>
            {t('pages.networkView.devices')} ({filteredHosts.length} / {hosts.length})
          </h2>

          <div className="filter-bar">
            <div className="filters filters-compact">
              <input
                type="text"
                className="filter-search"
                placeholder={t('pages.networkView.search')}
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
              />
              <select
                className="filter-select"
                value={statusFilter}
                onChange={(e) => onStatusFilterChange(e.target.value)}
                aria-label={t('common.status')}
              >
                <option value="all">{t('common.all')}</option>
                <option value="online">{t('common.online')}</option>
                <option value="offline">{t('common.offline')}</option>
              </select>
              <select
                className="filter-select"
                value={tagFilter || 'all'}
                onChange={(e) => onTagFilterChange(e.target.value === 'all' ? null : e.target.value)}
                aria-label={t('common.tags')}
              >
                <option value="all">{t('common.all')}</option>
                {availableTags.map(tag => (
                  <option key={tag.id} value={tag.id}>{tag.name}</option>
                ))}
              </select>
            </div>
          </div>

          {userType !== 'visitor' && selectedHostIds.length > 0 && (
            <div
              className="card"
              style={{
                marginBlockEnd: 'var(--spacing-md)',
                padding: 'var(--spacing-md)',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 'var(--spacing-sm)',
                border: '1px solid var(--primary)',
                backgroundColor: 'var(--bg-secondary)'
              }}
            >
              <span style={{ fontWeight: 'var(--font-weight-semibold)', marginInlineEnd: 'var(--spacing-sm)' }}>
                {t('pages.networkView.bulkSelected', { count: selectedHostIds.length })}
              </span>
              <button
                type="button"
                onClick={onBulkFavoritesAdd}
                disabled={bulkWorking}
                className="btn-secondary btn-small"
              >
                {t('pages.networkView.bulkAddFavorites')}
              </button>
              <button
                type="button"
                onClick={onBulkFavoritesRemove}
                disabled={bulkWorking}
                className="btn-secondary btn-small"
              >
                {t('pages.networkView.bulkRemoveFavorites')}
              </button>
              {isAdmin && (
                <>
                  <button
                    type="button"
                    onClick={onOpenBulkEditTags}
                    disabled={bulkWorking}
                    className="btn-secondary btn-small"
                  >
                    {t('pages.networkView.bulkEditTags')}
                  </button>
                  <button
                    type="button"
                    onClick={onBulkDelete}
                    disabled={bulkWorking}
                    className="btn-danger btn-small"
                  >
                    {t('pages.networkView.bulkDelete')}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={onClearSelection}
                className="btn-ghost btn-small"
              >
                {t('pages.networkView.bulkClearSelection')}
              </button>
            </div>
          )}

          {userType !== 'visitor' && filteredHosts.length > 0 && (
            <div style={{ marginBlockEnd: 'var(--spacing-sm)', display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
              <button type="button" onClick={onSelectOfflineFiltered} className="btn-ghost btn-small">
                {t('pages.networkView.selectOfflineFiltered')}
              </button>
            </div>
          )}

          <div className="table-container">
            <table className="table-compact">
              <thead>
                <tr>
                  {userType !== 'visitor' && (
                    <th style={{ width: '32px' }}>
                      <input
                        type="checkbox"
                        checked={
                          filteredHosts.length > 0 &&
                          filteredHosts.every((h) => selectedHostIds.includes(h.id))
                        }
                        onChange={onToggleSelectAllFiltered}
                        title={t('pages.networkView.selectAllFiltered')}
                      />
                    </th>
                  )}
                  <th onClick={() => onSortChange('name')}>
                    {t('common.name')} {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => onSortChange('ip')}>
                    {t('common.ip')} {sortBy === 'ip' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th onClick={() => onSortChange('status')}>
                    {t('common.status')} {sortBy === 'status' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>{t('pages.networkView.uptime24h')}</th>
                  <th className="col-hide-md" onClick={() => onSortChange('lastChecked')}>
                    {t('pages.networksList.lastScanned')} {sortBy === 'lastChecked' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th>{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedHosts.map(host => (
                  <tr key={host.id}>
                    {userType !== 'visitor' && (
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedHostIds.includes(host.id)}
                          onChange={() => onToggleHostSelected(host.id)}
                        />
                      </td>
                    )}
                    <td>
                      <DeviceSummaryCell host={host} language={language} t={t} />
                    </td>
                    <td><IpAddress>{host.ip}</IpAddress></td>
                    <td>
                      <span className={`status-badge status-badge-compact ${host.status === 'online' ? 'status-online' : 'status-offline'}`}>
                        {host.status === 'online' ? (
                          <><OnlineIcon size={11} /> {t('common.online')}</>
                        ) : (
                          <><OfflineIcon size={11} /> {t('common.offline')}</>
                        )}
                      </span>
                    </td>
                    <td style={{ whiteSpace: 'nowrap', fontSize: 'var(--font-size-xs)' }}>
                      {(host.uptimePercentage ?? 100).toFixed(1)}%
                    </td>
                    <td className="col-hide-md" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {host.lastChecked || host.last_checked ? formatDateTime(host.lastChecked || host.last_checked, language) : (<span style={{ color: 'var(--text-tertiary)' }}>-</span>)}
                    </td>
                    <td>
                      <div className="table-actions">
                        <button type="button" onClick={() => onViewHistory(host)} className="btn-secondary btn-icon-small" title={t('pages.networkView.viewHistory')}>
                          <ChartIcon size={14} />
                        </button>
                        {userType !== 'visitor' && (
                          <>
                          {isHostFavorite(host.id) ? (
                            <button onClick={() => onRemoveFromFavorites(host.id)} className="btn-warning btn-icon-small" title={t('pages.networkView.removeFromFavorites')}>
                              <StarIcon size={14} filled />
                            </button>
                          ) : (
                            <button onClick={() => onAddToFavorites(host.id)} className="btn-secondary btn-icon-small" title={t('pages.networkView.addToFavorites')}>
                              <StarIcon size={14} />
                            </button>
                          )}
                          {isAdmin && (
                            <>
                              <button onClick={() => onEditHost(host)} className="btn-secondary btn-icon-small" title={t('common.edit')}>
                                <EditIcon size={14} />
                              </button>
                              <button onClick={() => onDeleteHost(host.id)} className="btn-danger btn-icon-small" title={t('common.delete')}>
                                <DeleteIcon size={14} />
                              </button>
                            </>
                          )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredHosts.length > HOST_PAGE_SIZE && (
            <div className="table-pagination">
              <button type="button" className="btn-secondary btn-small" disabled={tablePage <= 1} onClick={() => onTablePageChange(tablePage - 1)}>
                {t('pages.networkView.prevPage')}
              </button>
              <span>{t('pages.networkView.pageOf', { page: tablePage, total: totalTablePages })}</span>
              <button type="button" className="btn-secondary btn-small" disabled={tablePage >= totalTablePages} onClick={() => onTablePageChange(tablePage + 1)}>
                {t('pages.networkView.nextPage')}
              </button>
            </div>
          )}
        </div>
      )}

      {(editingHostId || (bulkEditingIds && bulkEditingIds.length > 0)) && (
        <div className="modal-overlay" onClick={onCancelEdit}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>
                {bulkEditingIds && bulkEditingIds.length > 0
                  ? t('pages.networkView.bulkEditTagsTitle', { count: bulkEditingIds.length })
                  : t('pages.networkView.editHostTags')}
              </h2>
              <button onClick={onCancelEdit} className="btn-ghost btn-icon">
                <CloseIcon size={20} />
              </button>
            </div>

            {bulkEditingIds && bulkEditingIds.length > 0 ? (
              <p style={{ marginBlockEnd: 'var(--spacing-md)', fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                {t('pages.networkView.bulkEditTagsHint')}
              </p>
            ) : editingHost ? (
              <div style={{
                marginBlockEnd: 'var(--spacing-lg)',
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)'
              }}>
                <p style={{ margin: 0 }}><strong>{t('common.name')}:</strong> {getHostDisplayName(editingHost)}</p>
                <p style={{ margin: 0 }}><strong>{t('common.ip')}:</strong> <IpAddress as="span">{editingHost.ip}</IpAddress></p>
              </div>
            ) : null}

            <form onSubmit={onUpdateHost}>
              <div style={{ marginBlockEnd: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', marginBlockEnd: 'var(--spacing-sm)', fontWeight: 'var(--font-weight-semibold)' }}>{t('common.tags')}:</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
                  {availableTags.map(tag => (
                    <label key={tag.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={editFormData.tagIds.includes(tag.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onEditFormDataChange({ ...editFormData, tagIds: [...editFormData.tagIds, tag.id] })
                          } else {
                            onEditFormDataChange({ ...editFormData, tagIds: editFormData.tagIds.filter(id => id !== tag.id) })
                          }
                        }}
                      />
                      <span className="tag-badge" style={{ backgroundColor: tag.color || 'var(--primary)' }}>{tag.name}</span>
                    </label>
                  ))}
                  {availableTags.length === 0 && (
                    <p style={{ color: 'var(--text-secondary)' }}>{t('pages.networkView.noTagsAvailable')}</p>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={onCancelEdit} className="btn-secondary">
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-primary">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
