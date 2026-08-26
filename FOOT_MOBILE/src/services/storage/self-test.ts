/**
 * Storage self-test — Phase 1.5 verification utility
 *
 * Exercises both storage categories (write/read/overwrite/delete) and asserts
 * secret hygiene: no secure-category key ever appears in persistent storage.
 * Every test key is removed in `finally` blocks — no residue left behind.
 *
 * Run via the dev-only panel in App.tsx (__DEV__ gate). Safe to run any time.
 */
import {
  SECURE_KEYS,
  SECURE_SELF_TEST_KEY,
  SELF_TEST_PREFIX,
  STORAGE_KEYS,
} from './keys';
import { getPersistentBackend, persistentStorage, type PersistentBackend } from './persistent-storage';
import { secureStorage } from './secure-storage';

export type SelfTestState = 'pass' | 'fail' | 'skip';

export interface SelfTestResult {
  id: string;
  label: string;
  state: SelfTestState;
  detail?: string;
}

export interface StorageSelfTestReport {
  backend: PersistentBackend;
  secureSupported: boolean;
  results: SelfTestResult[];
  allPassed: boolean;
}

const SAMPLE_STRING = 'phase15-قيمة-✓-123';
const SAMPLE_JSON = { team: 'الوداد', points: 42, active: true } as const;
type SampleJson = typeof SAMPLE_JSON;

function ok(id: string, label: string, detail?: string): SelfTestResult {
  return { id, label, state: 'pass', detail };
}
function fail(id: string, label: string, detail?: string): SelfTestResult {
  return { id, label, state: 'fail', detail };
}

async function runSecureTests(): Promise<SelfTestResult[]> {
  if (!secureStorage.isSupported()) {
    return [
      {
        id: 'secure',
        label: 'SecureStore suite',
        state: 'skip',
        detail: `unsupported platform — secrets are never downgraded`,
      },
    ];
  }

  const results: SelfTestResult[] = [];

  try {
    await secureStorage.setItemAsync(SECURE_SELF_TEST_KEY, SAMPLE_STRING);
    const readBack = await secureStorage.getItemAsync(SECURE_SELF_TEST_KEY);
    results.push(
      readBack === SAMPLE_STRING
        ? ok('secure.roundtrip', 'Secure write/read')
        : fail('secure.roundtrip', 'Secure write/read', `got: ${String(readBack)}`),
    );
  } catch (error) {
    results.push(fail('secure.roundtrip', 'Secure write/read', String(error)));
  }

  try {
    const overwritten = `${SAMPLE_STRING}-2`;
    await secureStorage.setItemAsync(SECURE_SELF_TEST_KEY, overwritten);
    const readBack = await secureStorage.getItemAsync(SECURE_SELF_TEST_KEY);
    results.push(
      readBack === overwritten
        ? ok('secure.overwrite', 'Secure overwrite')
        : fail('secure.overwrite', 'Secure overwrite', `got: ${String(readBack)}`),
    );
  } catch (error) {
    results.push(fail('secure.overwrite', 'Secure overwrite', String(error)));
  }

  try {
    await secureStorage.deleteItemAsync(SECURE_SELF_TEST_KEY);
    const readBack = await secureStorage.getItemAsync(SECURE_SELF_TEST_KEY);
    results.push(
      readBack === null
        ? ok('secure.delete', 'Secure delete → null')
        : fail('secure.delete', 'Secure delete → null', `got: ${String(readBack)}`),
    );
  } catch (error) {
    results.push(fail('secure.delete', 'Secure delete → null', String(error)));
  }

  return results;
}

function runPersistentTests(): SelfTestResult[] {
  const results: SelfTestResult[] = [];
  const kStr = `${SELF_TEST_PREFIX}string`;
  const kJson = `${SELF_TEST_PREFIX}json`;
  const kBool = `${SELF_TEST_PREFIX}bool`;
  const kNum = `${SELF_TEST_PREFIX}number`;

  try {
    persistentStorage.setString(kStr, SAMPLE_STRING);
    const readBack = persistentStorage.getString(kStr);
    results.push(
      readBack === SAMPLE_STRING
        ? ok('persist.string', `Persistent string (${getPersistentBackend()})`)
        : fail('persist.string', 'Persistent string', `got: ${String(readBack)}`),
    );
  } catch (error) {
    results.push(fail('persist.string', 'Persistent string', String(error)));
  }

  try {
    persistentStorage.setJson<SampleJson>(kJson, SAMPLE_JSON);
    const readBack = persistentStorage.getJson<SampleJson>(kJson);
    results.push(
      readBack !== null &&
      readBack.team === SAMPLE_JSON.team &&
      readBack.points === SAMPLE_JSON.points &&
      readBack.active === SAMPLE_JSON.active
        ? ok('persist.json', 'Persistent JSON roundtrip')
        : fail('persist.json', 'Persistent JSON roundtrip', JSON.stringify(readBack)),
    );
  } catch (error) {
    results.push(fail('persist.json', 'Persistent JSON roundtrip', String(error)));
  }

  try {
    persistentStorage.setBool(kBool, true);
    const first = persistentStorage.getBool(kBool);
    persistentStorage.setBool(kBool, false);
    const second = persistentStorage.getBool(kBool);
    results.push(
      first === true && second === false
        ? ok('persist.bool', 'Persistent bool + overwrite')
        : fail('persist.bool', 'Persistent bool + overwrite', `first=${String(first)} second=${String(second)}`),
    );
  } catch (error) {
    results.push(fail('persist.bool', 'Persistent bool + overwrite', String(error)));
  }

  try {
    persistentStorage.setNumber(kNum, 42.5);
    const readBack = persistentStorage.getNumber(kNum);
    results.push(
      readBack === 42.5
        ? ok('persist.number', 'Persistent number')
        : fail('persist.number', 'Persistent number', `got: ${String(readBack)}`),
    );
  } catch (error) {
    results.push(fail('persist.number', 'Persistent number', String(error)));
  }

  return results;
}

/** Secret hygiene: secure-category keys must never exist in normal storage. */
function runHygieneTest(): SelfTestResult {
  const sensitiveKeys = [...Object.values(SECURE_KEYS), SECURE_SELF_TEST_KEY];
  const leaked = sensitiveKeys.filter((key) => persistentStorage.contains(key));
  return leaked.length === 0
    ? ok('hygiene', 'No secrets in normal storage')
    : fail('hygiene', 'No secrets in normal storage', `leaked keys: ${leaked.join(', ')}`);
}

function cleanupPersistentTestKeys(): void {
  for (const key of ['string', 'json', 'bool', 'number']) {
    persistentStorage.remove(`${SELF_TEST_PREFIX}${key}`);
  }
}

export async function runStorageSelfTest(): Promise<StorageSelfTestReport> {
  const backend = getPersistentBackend();
  const secureSupported = secureStorage.isSupported();

  let secureResults: SelfTestResult[] = [];
  try {
    secureResults = await runSecureTests();
  } finally {
    // Remove secure test key even if a step threw mid-suite.
    if (secureSupported) {
      try {
        await secureStorage.deleteItemAsync(SECURE_SELF_TEST_KEY);
      } catch {
        // best-effort cleanup
      }
    }
  }

  let persistResults: SelfTestResult[] = [];
  try {
    persistResults = runPersistentTests();
  } finally {
    cleanupPersistentTestKeys();
  }

  const hygiene = runHygieneTest();
  cleanupPersistentTestKeys();

  // Guard: STORAGE_KEYS themselves must also be untouched by tests.
  const prefsTouched = Object.values(STORAGE_KEYS).filter((key) => persistentStorage.contains(key));

  const results = [...secureResults, ...persistResults, hygiene];
  return {
    backend,
    secureSupported,
    results,
    allPassed: results.every((r) => r.state !== 'fail') && prefsTouched.length === 0,
  };
}
