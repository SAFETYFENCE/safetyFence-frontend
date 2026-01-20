import { storage } from '../utils/storage';
import { geofenceService } from './geofenceService';

const ENTRY_LOCK_TTL_MS = 30_000;

export async function processGeofenceEntries(
  entries: Array<{ geofenceId: number; name: string }>,
  entryState: { [key: number]: boolean },
  source: 'foreground' | 'background'
): Promise<void> {
  if (!entries.length) return;

  const now = Date.now();
  const locks = await storage.getGeofenceEntryLocks();
  let locksChanged = false;
  let stateChanged = false;

  for (const entry of entries) {
    const last = locks[entry.geofenceId];
    if (last && now - last < ENTRY_LOCK_TTL_MS) {
      continue;
    }

    locks[entry.geofenceId] = now;
    locksChanged = true;

    try {
      await geofenceService.recordEntry({ geofenceId: entry.geofenceId });
      entryState[entry.geofenceId] = true;
      stateChanged = true;
      console.log(`✅ [${source}] 지오펜스 진입 기록: ${entry.name}`);
    } catch (error) {
      console.warn(`⚠️ [${source}] 지오펜스 진입 기록 실패: ${entry.name}`, error);
      delete locks[entry.geofenceId];
      locksChanged = true;
    }
  }

  if (locksChanged) {
    await storage.setGeofenceEntryLocks(locks);
  }

  if (stateChanged) {
    await storage.setGeofenceEntryState(entryState);
  }
}
