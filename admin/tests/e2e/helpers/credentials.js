import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

export const AUTH_DIR = path.resolve(here, '../.auth');
export const CREDENTIALS_FILE = path.join(AUTH_DIR, 'credentials.json');
export const STORAGE_STATE = path.join(AUTH_DIR, 'state.json');

function readCredentialsFile() {
  try {
    return JSON.parse(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
  } catch {
    return {};
  }
}

/**
 * E2E credentials from the local, gitignored tests/e2e/.auth/credentials.json
 * and/or CI variables. E2E_USER / E2E_PASSWORD win over the file; the base URL
 * comes from the file and falls back to E2E_BASE_URL (CI has no file).
 */
export function loadCredentials() {
  const file = readCredentialsFile();
  return {
    baseURL: file.baseURL || process.env.E2E_BASE_URL,
    user: process.env.E2E_USER || file.user,
    password: process.env.E2E_PASSWORD || file.password
  };
}
