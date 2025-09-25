/**
 * Truncates text to a specified length and adds ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation (default: 30)
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string | null | undefined, maxLength: number = 30): string {
  if (!text) return '';

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.substring(0, maxLength)}...`;
}
