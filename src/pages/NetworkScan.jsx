import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from '../constants'
import { apiPost } from '../utils/api'

function NetworkScan() {
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
    <div className="container">
      <div className="header">
        <h1>مسح الشبكة</h1>
        <button onClick={() => navigate('/')}>العودة للعرض</button>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

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
          onClick={handleScan}
          disabled={scanning}
        >
          {scanning ? 'جاري المسح...' : 'بدء المسح'}
        </button>
      </div>

      {scanning && (
        <div className="loading">
          <p>جاري مسح الشبكة... قد يستغرق هذا بعض الوقت</p>
        </div>
      )}

        {scannedHosts.length > 0 && (
          <div>
            <div className="controls">
              <button 
                onClick={handleAddSelected}
                disabled={selectedHosts.size === 0}
              >
                إضافة المحدد ({Array.from(selectedHosts).filter(ip => {
                  const host = scannedHosts.find(h => h.ip === ip)
                  return host && !host.isExisting
                }).length})
              </button>
            </div>
            <h2>الأجهزة المكتشفة ({scannedHosts.length})</h2>

            <div className="hosts-list">
              {scannedHosts.map((host, index) => {
                const isExisting = host.isExisting || false
                const hostName = host.hostname || host.existingName || `Host ${host.ip.split('.').pop()}`
                
                return (
                  <div
                    key={index}
                    className="host-item"
                    onClick={() => !isExisting && toggleHostSelection(host.ip)}
                  >
                    <div>
                      <input
                        type="checkbox"
                        checked={selectedHosts.has(host.ip) && !isExisting}
                        onChange={() => !isExisting && toggleHostSelection(host.ip)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={isExisting}
                      />
                    </div>
                    <div>
                      <h3>{hostName}</h3>
                      <p>IP: {host.ip}</p>
                      {host.hostname && (
                        <p>Hostname: {host.hostname}</p>
                      )}
                      {host.port && (
                        <p>Port: {host.port}</p>
                      )}
                      {isExisting && (
                        <p>✓ الجهاز مضاف مسبقاً</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
    </div>
  )
}

export default NetworkScan
