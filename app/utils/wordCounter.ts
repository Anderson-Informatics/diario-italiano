/**
 * Count words in a text string
 * @param text - The text to count words in
 * @returns The number of words
 */
export function countWords(text: string): number {
  if (!text || text.trim().length === 0) {
    return 0
  }
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

/**
 * Count characters in a text string (excluding trailing whitespace)
 * @param text - The text to count characters in
 * @returns The number of characters
 */
export function countCharacters(text: string): number {
  return text ? text.length : 0
}