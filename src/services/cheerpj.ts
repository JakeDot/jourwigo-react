import { Cartridge } from '../types/wherigo';
import { generateCartridgeLuaScript, compileCartridgeToGwcBytes } from './compiler';

declare global {
  interface Window {
    cheerpjInit?: (options?: Record<string, unknown>) => Promise<void>;
    cjCall?: (className: string, methodName: string, ...args: unknown[]) => Promise<unknown>;
    cheerpjRunJar?: (jarPath: string, ...args: string[]) => Promise<number>;
  }
}

export type CheerpJStatus = 'UNINITIALIZED' | 'INITIALIZING' | 'READY' | 'FAILED' | 'FALLBACK';

let currentStatus: CheerpJStatus = 'UNINITIALIZED';
let statusMessage = 'Initializing Runtime...';
const listeners: ((status: CheerpJStatus, msg: string) => void)[] = [];

function notifyListeners(status: CheerpJStatus, msg: string) {
  currentStatus = status;
  statusMessage = msg;
  listeners.forEach((cb) => {
    try {
      cb(status, msg);
    } catch {
      // Ignore listener error
    }
  });
}

export function subscribeCheerpJStatus(callback: (status: CheerpJStatus, msg: string) => void): () => void {
  listeners.push(callback);
  callback(currentStatus, statusMessage);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

/**
 * Dynamically and asynchronously loads CheerpJ in background without blocking the UI
 */
export async function initCheerpJ(): Promise<boolean> {
  if (currentStatus === 'READY') return true;

  if (typeof window === 'undefined') {
    notifyListeners('FALLBACK', 'Native Wherigo Engine Active');
    return false;
  }

  notifyListeners('INITIALIZING', 'Starting CheerpJ JVM WebAssembly...');

  // If cheerpj is already on window
  if (window.cheerpjInit) {
    try {
      await window.cheerpjInit({ preloadResources: ['/jourwigo.jar'] });
      notifyListeners('READY', 'CheerpJ 3.0 JVM Active (WebAssembly)');
      return true;
    } catch (e) {
      console.warn('CheerpJ initialization fallback:', e);
      notifyListeners('FALLBACK', 'Native Wherigo Engine Active');
      return false;
    }
  }

  // Load dynamically via script tag with timeout
  return new Promise((resolve) => {
    let finished = false;

    // 4-second timeout to ensure the app never waits on blocked external CDNs
    const timeout = setTimeout(() => {
      if (!finished) {
        finished = true;
        notifyListeners('FALLBACK', 'Native Wherigo Engine Active');
        resolve(false);
      }
    }, 4000);

    try {
      const script = document.createElement('script');
      script.src = 'https://cjrtnc.cheerpj.com/3.0/loader.js';
      script.async = true;

      script.onload = async () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);

        try {
          if (window.cheerpjInit) {
            await window.cheerpjInit({ preloadResources: ['/jourwigo.jar'] });
            notifyListeners('READY', 'CheerpJ 3.0 JVM Active (WebAssembly)');
            resolve(true);
            return;
          }
        } catch (e) {
          console.warn('CheerpJ startup notice:', e);
        }

        notifyListeners('FALLBACK', 'Native Wherigo Engine Active');
        resolve(false);
      };

      script.onerror = () => {
        if (finished) return;
        finished = true;
        clearTimeout(timeout);
        notifyListeners('FALLBACK', 'Native Wherigo Engine Active');
        resolve(false);
      };

      document.head.appendChild(script);
    } catch (err) {
      if (!finished) {
        finished = true;
        clearTimeout(timeout);
        notifyListeners('FALLBACK', 'Native Wherigo Engine Active');
        resolve(false);
      }
    }
  });
}

/**
 * Compile cartridge using the Java library via CheerpJ WebAssembly bridge,
 * with automatic seamless fallback to native TypeScript compiler
 */
export async function compileGwcCartridge(
  cart: Cartridge
): Promise<{ bytes: Uint8Array; engineUsed: 'JAVA_CHEERPJ' | 'NATIVE_TS' }> {
  const luaScript = generateCartridgeLuaScript(cart);

  if (window.cjCall && currentStatus === 'READY') {
    try {
      const result = await window.cjCall(
        'net.jakedot.jourwigo.CheerpJBridge',
        'compileGwcFromLuaBytes',
        cart.name,
        cart.author,
        cart.version,
        cart.description,
        cart.latitude || 0,
        cart.longitude || 0,
        cart.altitude || 0,
        luaScript
      );

      if (result) {
        const u8 = result instanceof Uint8Array ? result : new Uint8Array(result as ArrayBuffer);
        return { bytes: u8, engineUsed: 'JAVA_CHEERPJ' };
      }
    } catch (err) {
      console.warn('CheerpJ Java compilation encountered error, using native compiler:', err);
    }
  }

  // Native TypeScript compiler fallback
  const bytes = compileCartridgeToGwcBytes(cart);
  return { bytes, engineUsed: 'NATIVE_TS' };
}
