/**
 * Utility functions for handling HTML content
 */

/**
 * Decodes HTML entities in a string
 * @param text - The string containing HTML entities
 * @returns The decoded string
 */
export function decodeHtmlEntities(text: string): string {
  if (!text) return text;

  // Use browser's built-in HTML decoding if available
  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  }

  // Fallback for server-side rendering - decode common HTML entities
  return text
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&#x60;/g, '`')
    .replace(/&#x3D;/g, '=');
}

/**
 * Encodes special characters to HTML entities
 * @param text - The string to encode
 * @returns The encoded string
 */
export function encodeHtmlEntities(text: string): string {
  if (!text) return text;

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Safely displays text that might contain HTML entities
 * @param text - The text to display
 * @returns The decoded text safe for display
 */
export function safeDisplayText(text: string | null | undefined): string {
  if (!text) return '';
  return decodeHtmlEntities(text);
}
