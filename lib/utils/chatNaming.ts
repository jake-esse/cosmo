/**
 * Auto-generate conversation names from first user message
 */

// Common filler words to remove
const FILLER_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in', 'on', 'at',
  'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during',
  'before', 'after', 'above', 'below', 'from', 'up', 'down', 'out', 'off', 'over',
  'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where',
  'why', 'how', 'all', 'both', 'each', 'few', 'more', 'most', 'other', 'some',
  'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'and', 'but', 'if', 'or', 'because', 'as', 'until', 'while', 'me', 'you', 'i',
  'my', 'your', 'our', 'their', 'what', 'which', 'who', 'whom', 'this', 'that',
  'these', 'those', 'am', 'been', 'being', 'get', 'got', 'getting'
]);

/**
 * Generate a conversation title from the first user message
 * @param message - The first user message content
 * @param maxWords - Maximum number of words in the title (default: 4)
 * @returns A title string with capitalized words
 */
export function generateConversationTitle(message: string, maxWords: number = 4): string {
  // Clean the message
  const cleaned = message
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();

  // Split into words and filter
  const words = cleaned
    .split(' ')
    .filter(word => word.length > 0 && !FILLER_WORDS.has(word));

  // If we have no meaningful words, use a default
  if (words.length === 0) {
    return 'New Conversation';
  }

  // Take up to maxWords meaningful words
  const titleWords = words.slice(0, maxWords);

  // Capitalize each word
  const title = titleWords
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

  return title;
}

/**
 * Generate a title with fallback for empty or very short messages
 */
export function generateSafeTitle(message: string | null | undefined): string {
  if (!message || message.trim().length === 0) {
    return 'New Conversation';
  }

  const title = generateConversationTitle(message);
  
  // If the generated title is too short, add context
  if (title.length < 3) {
    return 'New Conversation';
  }

  return title;
}