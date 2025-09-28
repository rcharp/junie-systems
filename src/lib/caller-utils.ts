/**
 * Cleans up caller names to provide meaningful defaults
 * when the AI incorrectly interprets responses as names
 */
export function cleanCallerName(callerName: string | undefined | null): string {
  if (!callerName) {
    return "A potential customer";
  }
  
  // Trim whitespace
  const cleaned = callerName.trim();
  
  // List of invalid names that should be replaced
  const invalidNames = [
    'sorry',
    'unknown',
    'unknown caller',
    'n/a',
    'null',
    'undefined',
    'no name',
    'not provided',
    'unavailable',
    'anonymous',
    'caller',
    'customer',
    'user',
    'hi',
    'hello',
    'yes',
    'no',
    'ok',
    'okay',
    'um',
    'uh',
    'ah',
    'hmm',
    'well',
    'actually',
    'so',
    'like',
    'you know',
    'i mean',
    'basically',
    'obviously',
    'clearly',
    'honestly',
    'literally',
    'just',
    'really',
    'very',
    'quite',
    'pretty',
    'maybe',
    'perhaps',
    'probably',
    'definitely',
    'absolutely',
    'certainly',
    'sure',
    'exactly',
    'right',
    'correct',
    'true',
    'false',
    'wrong',
    'mistake',
    'error',
    'problem',
    'issue',
    'question',
    'answer',
    'response',
    'reply',
    'call',
    'phone',
    'number',
    'help',
    'assistance',
    'support',
    'service',
    'information',
    'details',
    'about',
    'regarding',
    'concerning',
    'thanks',
    'thank you',
    'please',
    'excuse me',
    'pardon',
    'what',
    'when',
    'where',
    'why',
    'how',
    'who',
    'which',
    'that',
    'this',
    'there',
    'here',
    'now',
    'then',
    'today',
    'tomorrow',
    'yesterday',
    'morning',
    'afternoon',
    'evening',
    'night'
  ];
  
  // Check if the cleaned name is invalid (case insensitive)
  if (invalidNames.includes(cleaned.toLowerCase()) || cleaned.length < 2) {
    return "A potential customer";
  }
  
  // Check if it's just numbers or special characters
  if (/^[\d\s\-\(\)\+\.]*$/.test(cleaned)) {
    return "A potential customer";
  }
  
  // Check if it looks like a phone number
  if (/^\(?[\d\s\-\(\)\+\.]{7,}$/.test(cleaned)) {
    return "A potential customer";
  }
  
  // Check if it's too long to be a reasonable name (likely a sentence fragment)
  if (cleaned.length > 50) {
    return "A potential customer";
  }
  
  // Check if it contains multiple sentences or question marks
  if (cleaned.includes('.') || cleaned.includes('?') || cleaned.includes('!')) {
    return "A potential customer";
  }
  
  // If it passes all checks, return the cleaned name with proper capitalization
  return cleaned
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}