/**
 * Cleans up transcript formatting by removing excessive whitespace from pauses
 * while preserving double spacing between responses
 */
export function cleanTranscript(transcript: string): string {
  if (!transcript) return transcript;
  
  // Split by lines first
  const lines = transcript.split('\n');
  const cleanedLines: string[] = [];
  
  let previousWasEmpty = false;
  let responseCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // If line is empty
    if (line === '') {
      // Only add one empty line between responses, not multiple
      if (!previousWasEmpty && responseCount > 0) {
        cleanedLines.push('');
        previousWasEmpty = true;
      }
      continue;
    }
    
    // If line has content
    if (line.length > 0) {
      // Check if this is a speaker line (Agent: or Caller:)
      const isSpeakerLine = /^(Agent|Caller):/i.test(line);
      
      if (isSpeakerLine) {
        // If we have responses already and this is a new speaker, ensure double spacing
        if (responseCount > 0 && cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== '') {
          cleanedLines.push('');
          cleanedLines.push('');
        }
        responseCount++;
      }
      
      cleanedLines.push(line);
      previousWasEmpty = false;
    }
  }
  
  // Join back together and clean up any excessive whitespace within lines
  let result = cleanedLines.join('\n');
  
  // Remove multiple consecutive whitespace characters within lines (but preserve line breaks)
  result = result.replace(/[ \t]+/g, ' ');
  
  // Remove any trailing or leading whitespace
  result = result.trim();
  
  return result;
}