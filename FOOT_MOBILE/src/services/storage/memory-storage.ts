/**
 * In-memory key/value engine — Phase 1.5
 *
 * Pure module (zero react-native imports) so it stays unit-testable in Node.
 * Used as the web fallback for persistent storage, and as an emergency
 * fallback when expo-sqlite cannot initialize.
 */
export interface StringKV {
  getString(key: string): string | undefined;
  setString(key: string, value: string): void;
  remove(key: string): void;
  contains(key: string): boolean;
  clearAll(): void;
}

export function createMemoryStorage(): StringKV {
  const map = new Map<string, string>();

  return {
    getString(key) {
      return map.get(key);
    },
    setString(key, value) {
      map.set(key, value);
    },
    remove(key) {
      map.delete(key);
    },
    contains(key) {
      return map.has(key);
    },
    clearAll() {
      map.clear();
    },
  };
}
