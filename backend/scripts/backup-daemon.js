/* eslint-disable no-console */
const { spawn } = require('child_process');
const path = require('path');

const backupScript = path.join(__dirname, 'daily-mongo-backup.js');
const intervalMs = Number.parseInt(process.env.BACKUP_INTERVAL_MS || String(24 * 60 * 60 * 1000), 10);

function runBackupJob() {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [backupScript], {
      stdio: 'inherit',
      windowsHide: true
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('Backup cycle finished.');
      } else {
        console.error('Backup cycle failed with code:', code);
      }
      resolve();
    });
  });
}

(async function startDaemon() {
  console.log('GEMA backup daemon started. Interval (ms):', intervalMs);
  await runBackupJob();

  setInterval(() => {
    runBackupJob();
  }, intervalMs);
})();
