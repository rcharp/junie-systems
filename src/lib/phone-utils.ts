/**
 * Formats a phone number for display
 * @param phone - 10 digit phone number
 * @returns Formatted phone number in (XXX) XXX-XXXX format
 */
export const formatPhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Format as (XXX) XXX-XXXX
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // If it's 11 digits and starts with 1, remove the 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  
  // Return as-is if not a valid format
  return phone;
};

/**
 * Normalizes a phone number to 10 digits only
 * @param phone - Phone number with any formatting
 * @returns 10 digit phone number without formatting
 */
export const normalizePhoneNumber = (phone: string | null | undefined): string => {
  if (!phone) return '';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // If it's 11 digits and starts with 1, remove the 1
  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }
  
  return digits;
};

/**
 * Validates if a phone number is valid (10 digits)
 * @param phone - Phone number to validate
 * @returns True if valid
 */
export const isValidPhoneNumber = (phone: string | null | undefined): boolean => {
  if (!phone) return false;
  
  const normalized = normalizePhoneNumber(phone);
  return normalized.length === 10;
};

/**
 * Handles backspace key for phone number inputs to allow deleting through special characters
 * @param e - Keyboard event
 * @param currentValue - Current phone number value
 * @param onChange - Callback to update the value
 */
export const handlePhoneBackspace = (
  e: React.KeyboardEvent<HTMLInputElement>,
  currentValue: string,
  onChange: (value: string) => void
) => {
  if (e.key === 'Backspace') {
    e.preventDefault();
    const normalized = normalizePhoneNumber(currentValue);
    const newValue = normalized.slice(0, -1);
    onChange(newValue);
  }
};
