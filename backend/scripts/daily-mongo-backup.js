/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../.env') });

const mongoUri = process.env.MONGO_URI;
const backupRoot = path.resolve(
  __dirname,
  '../../',
  process.env.BACKUP_DIR || 'backend/backups'
);
const keepLast = Number.parseInt(process.env.BACKUP_KEEP_LAST || '14', 10);
const webhookUrl = String(process.env.BACKUP_WEBHOOK_URL || '').trim();

if (!mongoUri) {
  console.error('Missing MONGO_URI in environment. Backup stopped.');
  process.exit(1);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || stdout || error.message));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function pad(value) {
  return String(value).padStart(2, '0');
}

function timestampStamp(date = new Date()) {
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}_${pad(date.getUTCHours())}-${pad(date.getUTCMinutes())}-${pad(date.getUTCSeconds())}`;
}

async function notifyWebhook(payload) {
  if (!webhookUrl) return;

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.warn('Backup webhook returned non-OK status:', response.status);
    }
  } catch (error) {
    console.warn('Backup webhook notification failed:', error.message);
  }
}

function pruneOldBackups(root, keep) {
  const archives = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.archive.gz'))
    .map((entry) => ({
      name: entry.name,
      fullPath: path.join(root, entry.name),
      mtimeMs: fs.statSync(path.join(root, entry.name)).mtimeMs
    }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  const stale = archives.slice(Math.max(keep, 0));
  stale.forEach((entry) => {
    try {
      fs.unlinkSync(entry.fullPath);
      console.log('Deleted old backup:', entry.name);
    } catch (error) {
      console.warn('Failed deleting old backup:', entry.name, error.message);
    }
  });
}

async function runBackup() {
  fs.mkdirSync(backupRoot, { recursive: true });

  const stamp = timestampStamp();
  const archivePath = path.join(backupRoot, `mongo-${stamp}.archive.gz`);
  const manifestPath = path.join(backupRoot, `mongo-${stamp}.json`);

  console.log('Starting backup to:', archivePath);

  await runCommand('mongodump', [
    `--uri=${mongoUri}`,
    '--gzip',
    `--archive=${archivePath}`
  ]);

  const stat = fs.statSync(archivePath);
  const manifest = {
    createdAt: new Date().toISOString(),
    archivePath,
    sizeBytes: stat.size,
    mongoUriMasked: mongoUri.replace(/:\/\/([^@/]+)@/, '://***@')
  };

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  pruneOldBackups(backupRoot, keepLast);

  await notifyWebhook({
    event: 'mongo_backup_created',
    ...manifest
  });

  console.log('Backup completed successfully.');
  console.log('Manifest:', manifestPath);
}

runBackup().catch((error) => {
  console.error('Backup failed:', error.message);
  process.exit(1);
});
