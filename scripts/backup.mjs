import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDir = process.env.RITZY_DATA_DIR || path.join(process.cwd(), "data");
const backupRoot = process.env.RITZY_BACKUP_DIR || path.join(dataDir, "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const staging = fs.mkdtempSync(path.join(os.tmpdir(), "ritzy-backup-"));
const dbPath = path.join(dataDir, "ritzy.sqlite");
const uploads = path.join(dataDir, "uploads");

fs.mkdirSync(backupRoot, { recursive: true });

if (fs.existsSync(dbPath)) {
  const dest = path.join(staging, "ritzy.sqlite");
  const db = new DatabaseSync(dbPath);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec(`VACUUM INTO '${dest.replaceAll("'", "''")}'`);
  db.close();
}

if (fs.existsSync(uploads)) {
  fs.cpSync(uploads, path.join(staging, "uploads"), { recursive: true });
}

const archive = path.join(backupRoot, `ritzy-${stamp}.tar.gz`);
execFileSync("tar", ["-czf", archive, "-C", staging, "."]);
fs.rmSync(staging, { recursive: true, force: true });
process.stdout.write(`${archive}\n`);
