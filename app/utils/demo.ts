/**
 * Public demo constants (Phase E). The demo device id is PUBLIC by design:
 * the landing links straight to it, and it only exists in the demo database
 * (DEMO_DATABASE_URL) — it resolves to nothing on prod.
 */
export const DEMO_HOST = 'demo.job-conciergerie.fr';
export const DEMO_DEVICE_ID = 'v2_de01de01de01de01de01de01de01de01';
export const DEMO_URL = `https://${DEMO_HOST}/${DEMO_DEVICE_ID}`;
/** Landing "Essayer la démo" target — resets the demo DB then redirects to DEMO_URL. */
export const DEMO_ENTER_URL = `https://${DEMO_HOST}/api/demo/enter`;
