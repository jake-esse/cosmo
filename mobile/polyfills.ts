/**
 * Polyfills for AI SDK Streaming Support
 *
 * Required for Vercel AI SDK to work with streaming responses in React Native.
 * Only applied on native platforms (iOS/Android), not web.
 *
 * Polyfills added:
 * - structuredClone: Deep cloning objects
 * - TextEncoderStream: Encoding text to streams
 * - TextDecoderStream: Decoding streams to text
 *
 * @see https://ai-sdk.dev/docs/getting-started/expo
 */

import { Platform } from 'react-native';

if (Platform.OS !== 'web') {
  const setupPolyfills = async () => {
    // Import polyfillGlobal utility from React Native
    const { polyfillGlobal } = await import(
      'react-native/Libraries/Utilities/PolyfillFunctions'
    );

    // Import streaming text encoding polyfills
    const { TextEncoderStream, TextDecoderStream } = await import(
      '@stardazed/streams-text-encoding'
    );

    // Import structuredClone polyfill
    const structuredClone = (await import('@ungap/structured-clone')).default;

    // Apply polyfills to global scope
    if (!('structuredClone' in global)) {
      polyfillGlobal('structuredClone', () => structuredClone);
    }

    polyfillGlobal('TextEncoderStream', () => TextEncoderStream);
    polyfillGlobal('TextDecoderStream', () => TextDecoderStream);
  };

  // Execute polyfill setup
  setupPolyfills();
}

// Export empty object to make this a valid module
export {};
