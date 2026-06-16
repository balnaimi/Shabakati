import 'dotenv/config';
import createApp from './createApp.js';
import { assertJwtSecretForProduction } from './auth.js';
import { initializeAutoScans } from './autoScanService.js';
import { startOfflineReleaseTicker } from './offlineReleaseService.js';
import { startBackupScheduler } from './backupService.js';
import logger from './logger.js';

const PORT = process.env.PORT || 3001;

assertJwtSecretForProduction();

const app = createApp();

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📡 API available on all interfaces: http://0.0.0.0:${PORT}/api`);
  logger.info(`🌐 Access from local network at: http://<SERVER_IP>:${PORT}/api`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);

  initializeAutoScans();
  startOfflineReleaseTicker();
  startBackupScheduler();
}).on('error', (err) => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
