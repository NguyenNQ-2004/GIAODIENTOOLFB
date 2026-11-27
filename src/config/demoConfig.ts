/**
 * Explicit DEMO / Prototype mode boundary configuration.
 * In production builds, VITE_DEMO_MODE should be set to "false" so all demo quick-login
 * buttons, localStorage mock persistence, and /extension-preview scenario controls are disabled.
 */

const rawDemoFlag =
  typeof import.meta !== 'undefined' && import.meta.env
    ? import.meta.env.VITE_DEMO_MODE
    : undefined;

const isDevEnv =
  typeof import.meta !== 'undefined' && import.meta.env
    ? Boolean(import.meta.env.DEV)
    : true;

// Enabled by default in prototype/dev unless explicitly disabled with VITE_DEMO_MODE=false
export const IS_DEMO_MODE: boolean = rawDemoFlag !== 'false';
export const IS_DEV_OR_DEMO: boolean = isDevEnv || IS_DEMO_MODE;

export const DEMO_SCHEMA_VERSION = 3;
export const STORAGE_DB_KEY = 'fbpostpro_demo_db_v3';
export const STORAGE_SESSION_KEY = 'fbpostpro_demo_session_user_id_v3';
export const LEGACY_STORAGE_KEYS = [
  'fbpostpro_demo_db_v2',
  'fbpostpro_demo_session_user_id_v2',
  'fbpostpro_demo_db_v1',
];
