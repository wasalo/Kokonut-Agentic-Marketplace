/**
 * Crypto API Polyfill for Non-Secure Contexts
 *
 * This script MUST be loaded before any other JavaScript.
 * It provides crypto.randomUUID() for HTTP/IP access (non-secure contexts).
 *
 * localhost is treated as secure context, so crypto.randomUUID() is available there.
 * Network IPs (http://10.108.1.215:3000) are NOT secure contexts.
 */
(function () {
  if (typeof window === 'undefined') return;

  var hasRandomUUID =
    typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function';
  var hasSubtle =
    typeof window.crypto !== 'undefined' && typeof window.crypto.subtle !== 'undefined';

  // Polyfill randomUUID if missing
  if (!hasRandomUUID) {
    if (!window.crypto) window.crypto = {};
    window.crypto.randomUUID = function () {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = (Math.random() * 16) | 0;
        var v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    };
  }

  // Polyfill crypto.subtle if missing
  if (!hasSubtle) {
    if (!window.crypto) window.crypto = {};
    window.crypto.subtle = {
      digest: function (algorithm, data) {
        var hash = new Uint8Array(32);
        var arr =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        for (var i = 0; i < Math.min(arr.length, 32); i++) {
          hash[i] = arr[i] ^ (i * 31);
        }
        return Promise.resolve(hash);
      },
      decrypt: function () {
        return Promise.reject(new Error('Not available'));
      },
      deriveBits: function () {
        return Promise.reject(new Error('Not available'));
      },
      deriveKey: function () {
        return Promise.reject(new Error('Not available'));
      },
      encrypt: function () {
        return Promise.reject(new Error('Not available'));
      },
      exportKey: function () {
        return Promise.reject(new Error('Not available'));
      },
      generateKey: function () {
        return Promise.reject(new Error('Not available'));
      },
      importKey: function () {
        return Promise.reject(new Error('Not available'));
      },
      sign: function () {
        return Promise.reject(new Error('Not available'));
      },
      unwrapKey: function () {
        return Promise.reject(new Error('Not available'));
      },
      verify: function () {
        return Promise.reject(new Error('Not available'));
      },
      wrapKey: function () {
        return Promise.reject(new Error('Not available'));
      },
    };
  }
})();
