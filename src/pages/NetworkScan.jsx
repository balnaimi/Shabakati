import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Plus, PlusCircle, ArrowRight, Clock } from 'lucide-react'
import { API_URL } from '../constants'
import { apiPost } from '../utils/api'
import './NetworkScan.css'

function NetworkScan({ theme }) {
  const navigate = useNavigate()
  const [networkRange, setNetworkRange] = useState('192.168.30.1-254')
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState(null)
  const [scannedHosts, setScannedHosts] = useState([])
  const [selectedHosts, setSelectedHosts] = useState(new Set())

  const handleScan = async () => {
    if (!networkRange.trim()) {
      setError('يرجى إدخال نطاق الشبكة')
      return
    }

    try {
      setError(null)
      setScanning(true)
      setScannedHosts([])
      setSelectedHosts(new Set())

      const data = await apiPost('/network/scan', {
        networkRange: networkRange.trim(),
        timeout: 2
      })

      setScannedHosts(data.hosts || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setScanning(false)
    }
  }

  const toggleHostSelection = (ip) => {
    const newSelected = new Set(selectedHosts)
    if (newSelected.has(ip)) {
      newSelected.delete(ip)
    } else {
      newSelected.add(ip)
    }
    setSelectedHosts(newSelected)
  }

  const handleAddSelected = async () => {
    if (selectedHosts.size === 0) {
      setError('يرجى اختيار جهاز واحد على الأقل')
      return
    }

    try {
      setError(null)
      const selectedIPs = Array.from(selectedHosts)
      const hostsToAdd = scannedHosts.filter(host => 
        selectedIPs.includes(host.ip) && !host.isExisting
      )

      if (hostsToAdd.length === 0) {
        setError('جميع الأجهزة المحددة مضافه مسبقاً')
        return
      }

      const addPromises = hostsToAdd.map(async (host) => {
        await apiPost('/hosts', {
          name: host.hostname || host.existingName || `Host ${host.ip.split('.').pop()}`,
          ip: host.ip,
          description: `تم اكتشافه من مسح الشبكة${host.port ? ` (Port: ${host.port})` : ''}`,
          url: '',
          status: 'online'
        })
      })

      await Promise.all(addPromises)
      navigate('/')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="network-scan-page">
      <header className="page-header">
        <h1>
          <Search size={28} className="header-icon" />
          <span>مسح الشبكة</span>
        </h1>
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowRight size={18} style={{ marginLeft: '8px' }} />
          العودة للعرض
        </button>
      </header>

      <section className="scan-section">
        <div className="scan-form">
          <div className="form-group">
            <label htmlFor="networkRange">نطاق الشبكة:</label>
            <input
              type="text"
              id="networkRange"
              value={networkRange}
              onChange={(e) => setNetworkRange(e.target.value)}
              placeholder="مثال: 192.168.30.1-254 أو 192.168.30.0/24"
              disabled={scanning}
            />
          </div>

          <button 
            className="scan-btn" 
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <>
                <Clock size={18} style={{ marginLeft: '8px' }} />
                جاري المسح...
              </>
            ) : (
              <>
                <Search size={18} style={{ marginLeft: '8px' }} />
                بدء المسح
              </>
            )}
          </button>
        </div>

        {error && (
          <div className="error-message">
            ⚠️ {error}
          </div>
        )}

        {scanning && (
          <div className="scanning-indicator">
            <p>
              <Clock size={18} style={{ marginLeft: '8px', display: 'inline-block', verticalAlign: 'middle' }} />
              جاري مسح الشبكة... قد يستغرق هذا بعض الوقت
            </p>
          </div>
        )}

        {scannedHosts.length > 0 && (
          <div className="scanned-hosts">
            <div className="hosts-header">
              <h2>الأجهزة المكتشفة ({scannedHosts.length})</h2>
              {selectedHosts.size > 0 && (
                <button className="add-selected-btn" onClick={handleAddSelected}>
                  {theme === 'light' ? <PlusCircle size={18} style={{ marginLeft: '8px' }} /> : <Plus size={18} style={{ marginLeft: '8px' }} />}
                  إضافة المحدد ({Array.from(selectedHosts).filter(ip => {
                    const host = scannedHosts.find(h => h.ip === ip)
                    return host && !host.isExisting
                  }).length})
                </button>
              )}
            </div>

            <div className="hosts-grid">
              {scannedHosts.map((host, index) => {
                const isExisting = host.isExisting || false
                const hostName = host.hostname || host.existingName || `Host ${host.ip.split('.').pop()}`
                
                return (
                  <div
                    key={index}
                    className={`host-item ${selectedHosts.has(host.ip) && !isExisting ? 'selected' : ''} ${isExisting ? 'existing' : ''}`}
                    onClick={() => !isExisting && toggleHostSelection(host.ip)}
                  >
                    <div className="host-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedHosts.has(host.ip) && !isExisting}
                        onChange={() => !isExisting && toggleHostSelection(host.ip)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isExisting}
                      />
                    </div>
                    <div className="host-info">
                      <h3>{hostName}</h3>
                      <p className="host-ip">📍 {host.ip}</p>
                      {host.hostname && (
                        <p className="host-hostname">🏷️ {host.hostname}</p>
                      )}
                      {host.port && (
                        <p className="host-port">🔌 Port: {host.port}</p>
                      )}
                      {isExisting && (
                        <p className="host-existing" style={{ color: '#10b981', fontWeight: '600', marginTop: '8px' }}>
                          ✓ الجهاز مضاف مسبقاً
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

export default NetworkScan

