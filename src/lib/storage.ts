import fs from "node:fs";
import path from "node:path";
import { dataDir } from "./config.ts";

export function assertDatabaseDriver() {
  const driver = (process.env.RITZY_DATABASE_DRIVER || "sqlite").trim();
  if (driver !== "sqlite") {
    throw new Error(
      `Database driver "${driver}" is not set up. This shop still runs on one SQLite file. Set RITZY_DATABASE_DRIVER=sqlite.`,
    );
  }
}

export function assertFileDriver() {
  const driver = (process.env.RITZY_FILE_DRIVER || "local").trim();
  if (driver !== "local") {
    throw new Error(
      `File driver "${driver}" is not set up. Photos still live on local disk. Set RITZY_FILE_DRIVER=local.`,
    );
  }
}

export function sqlitePath() {
  assertDatabaseDriver();
  return path.join(dataDir(), "ritzy.sqlite");
}

export function uploadsDir() {
  assertFileDriver();
  return path.join(dataDir(), "uploads");
}

export function putUpload(filename: string, bytes: Buffer) {
  const dir = uploadsDir();
  fs.mkdirSync(dir, { recursive: true });
  const full = path.join(dir, filename);
  fs.writeFileSync(full, bytes, { mode: 0o644 });
  return full;
}

export function removeUpload(filename: string) {
  const full = path.join(uploadsDir(), filename);
  try {
    fs.unlinkSync(full);
  } catch {
    /* already gone */
  }
}
