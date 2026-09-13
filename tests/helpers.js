// Minimal in-memory localStorage polyfill for tests (Node has no global
// localStorage). storage.js looks up globalThis.localStorage lazily on every
// call, so it's enough to install this before each test that needs it.
export class MemoryStorage {
    #store = new Map();

    getItem(key) {
        return this.#store.has(key) ? this.#store.get(key) : null;
    }

    setItem(key, value) {
        this.#store.set(key, String(value));
    }

    removeItem(key) {
        this.#store.delete(key);
    }

    clear() {
        this.#store.clear();
    }
}

export function installMemoryStorage() {
    const storage = new MemoryStorage();
    globalThis.localStorage = storage;
    return storage;
}
