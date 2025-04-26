'use client';

/**
 * Safely creates a Buffer from an ArrayBuffer in both Node.js and browser environments
 * @param arrayBuffer The ArrayBuffer to convert to a Buffer
 */
export const createBufferFromArrayBuffer = (arrayBuffer: ArrayBuffer): Buffer => {
  // In browser environments, we need to handle Buffer creation differently
  if (typeof window !== 'undefined') {
    // For browsers, use Buffer.from if available, or fallback to a Uint8Array
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(arrayBuffer);
    }
    
    // Fallback for environments where Buffer is not available
    return new Uint8Array(arrayBuffer) as unknown as Buffer;
  }
  
  // In Node.js, we can use Buffer directly
  return Buffer.from(arrayBuffer);
};

/**
 * Safely creates a Buffer from a string in both Node.js and browser environments
 * @param str The string to convert to a Buffer
 * @param encoding Optional encoding (default: 'utf-8')
 */
export const createBufferFromString = (str: string, encoding: BufferEncoding = 'utf-8'): Buffer => {
  if (typeof window !== 'undefined') {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(str, encoding);
    }
    
    // Fallback for environments where Buffer is not available
    const encoder = new TextEncoder();
    return encoder.encode(str) as unknown as Buffer;
  }
  
  return Buffer.from(str, encoding);
}; 