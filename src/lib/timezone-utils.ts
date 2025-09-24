import { format, toZonedTime } from 'date-fns-tz';

/**
 * Utility functions for timezone handling
 */

/**
 * Gets the user's current timezone and offset
 */
export const getUserTimezone = () => {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const now = new Date();
  const offset = format(now, 'xxx', { timeZone: timezone });
  
  return {
    timezone,
    offset
  };
};

/**
 * Gets timezone based on address using Google's timezone API
 * For demo purposes, returns common US timezones based on state
 */
export const getTimezoneFromAddress = (address: string) => {
  if (!address) return getUserTimezone();
  
  const addressLower = address.toLowerCase();
  
  // Simple state-based timezone mapping
  const timezoneMap: Record<string, { timezone: string; offset: string }> = {
    // Eastern Time
    'new york': { timezone: 'America/New_York', offset: '-05:00' },
    'florida': { timezone: 'America/New_York', offset: '-05:00' },
    'georgia': { timezone: 'America/New_York', offset: '-05:00' },
    'virginia': { timezone: 'America/New_York', offset: '-05:00' },
    'north carolina': { timezone: 'America/New_York', offset: '-05:00' },
    'south carolina': { timezone: 'America/New_York', offset: '-05:00' },
    'massachusetts': { timezone: 'America/New_York', offset: '-05:00' },
    'connecticut': { timezone: 'America/New_York', offset: '-05:00' },
    'pennsylvania': { timezone: 'America/New_York', offset: '-05:00' },
    
    // Central Time
    'texas': { timezone: 'America/Chicago', offset: '-06:00' },
    'illinois': { timezone: 'America/Chicago', offset: '-06:00' },
    'missouri': { timezone: 'America/Chicago', offset: '-06:00' },
    'louisiana': { timezone: 'America/Chicago', offset: '-06:00' },
    'minnesota': { timezone: 'America/Chicago', offset: '-06:00' },
    'wisconsin': { timezone: 'America/Chicago', offset: '-06:00' },
    'iowa': { timezone: 'America/Chicago', offset: '-06:00' },
    'kansas': { timezone: 'America/Chicago', offset: '-06:00' },
    'oklahoma': { timezone: 'America/Chicago', offset: '-06:00' },
    
    // Mountain Time
    'colorado': { timezone: 'America/Denver', offset: '-07:00' },
    'utah': { timezone: 'America/Denver', offset: '-07:00' },
    'wyoming': { timezone: 'America/Denver', offset: '-07:00' },
    'montana': { timezone: 'America/Denver', offset: '-07:00' },
    'new mexico': { timezone: 'America/Denver', offset: '-07:00' },
    'arizona': { timezone: 'America/Phoenix', offset: '-07:00' }, // Arizona doesn't observe DST
    
    // Pacific Time
    'california': { timezone: 'America/Los_Angeles', offset: '-08:00' },
    'washington': { timezone: 'America/Los_Angeles', offset: '-08:00' },
    'oregon': { timezone: 'America/Los_Angeles', offset: '-08:00' },
    'nevada': { timezone: 'America/Los_Angeles', offset: '-08:00' },
    
    // Alaska/Hawaii
    'alaska': { timezone: 'America/Anchorage', offset: '-09:00' },
    'hawaii': { timezone: 'Pacific/Honolulu', offset: '-10:00' },
  };
  
  // Check for state matches
  for (const [state, tz] of Object.entries(timezoneMap)) {
    if (addressLower.includes(state)) {
      return tz;
    }
  }
  
  // Default to user's current timezone if no match
  return getUserTimezone();
};

/**
 * Formats a timezone offset for display
 */
export const formatTimezoneOffset = (offset: string) => {
  return `UTC${offset}`;
};

/**
 * Converts a date/time from one timezone to another
 */
export const convertTimezone = (dateTime: string, fromTz: string, toTz: string) => {
  const date = new Date(dateTime);
  return toZonedTime(date, toTz).toISOString();
};

/**
 * Gets all common US timezones for selection
 */
export const getCommonTimezones = () => {
  return [
    { label: 'Eastern Time (UTC-5)', value: 'America/New_York', offset: '-05:00' },
    { label: 'Central Time (UTC-6)', value: 'America/Chicago', offset: '-06:00' },
    { label: 'Mountain Time (UTC-7)', value: 'America/Denver', offset: '-07:00' },
    { label: 'Pacific Time (UTC-8)', value: 'America/Los_Angeles', offset: '-08:00' },
    { label: 'Alaska Time (UTC-9)', value: 'America/Anchorage', offset: '-09:00' },
    { label: 'Hawaii Time (UTC-10)', value: 'Pacific/Honolulu', offset: '-10:00' },
    { label: 'Arizona Time (UTC-7)', value: 'America/Phoenix', offset: '-07:00' },
  ];
};