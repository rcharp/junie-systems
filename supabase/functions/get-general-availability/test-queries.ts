// Test suite for natural language date parsing
// Run this to verify all queries work correctly from business timezone perspective

import { toZonedTime, format } from 'https://esm.sh/date-fns-tz@3.2.0';

// Simulating today as Wednesday, October 22nd, 2025
const MOCK_NOW = new Date('2025-10-22T14:30:00Z'); // 2:30 PM UTC
const TEST_TIMEZONE = 'America/New_York'; // Eastern Time

interface TestCase {
  query: string;
  expectedDate: string; // YYYY-MM-DD format
  description: string;
}

const testCases: TestCase[] = [
  // Basic day references
  { query: 'today', expectedDate: '2025-10-22', description: 'Today (Wednesday)' },
  { query: 'tomorrow', expectedDate: '2025-10-23', description: 'Tomorrow (Thursday)' },
  
  // Simple day names (next occurrence)
  { query: 'monday', expectedDate: '2025-10-27', description: 'Next Monday' },
  { query: 'friday', expectedDate: '2025-10-24', description: 'Next Friday' },
  { query: 'wednesday', expectedDate: '2025-10-29', description: 'Next Wednesday (week from today)' },
  
  // Next [day]
  { query: 'next monday', expectedDate: '2025-10-27', description: 'Next Monday' },
  { query: 'next friday', expectedDate: '2025-10-24', description: 'Next Friday' },
  { query: 'next wednesday', expectedDate: '2025-10-29', description: 'Next Wednesday' },
  
  // Next week
  { query: 'next week', expectedDate: '2025-10-27', description: 'Next week Monday (first day of next calendar week)' },
  { query: 'next week monday', expectedDate: '2025-10-27', description: 'Next week Monday' },
  { query: 'next week friday', expectedDate: '2025-10-31', description: 'Next week Friday' },
  
  // Number of days
  { query: '2 days from now', expectedDate: '2025-10-24', description: '2 days from Wednesday = Friday' },
  { query: 'three days', expectedDate: '2025-10-25', description: '3 days from Wednesday = Saturday' },
  { query: '7 days from today', expectedDate: '2025-10-29', description: '7 days = next Wednesday' },
  
  // Number of weeks
  { query: '2 weeks from now', expectedDate: '2025-11-05', description: '2 weeks from Wednesday' },
  { query: 'three weeks', expectedDate: '2025-11-12', description: '3 weeks from Wednesday' },
  
  // Multiple occurrences of a day
  { query: 'two fridays from now', expectedDate: '2025-10-31', description: 'Second Friday from today' },
  { query: 'three mondays from today', expectedDate: '2025-11-10', description: 'Third Monday from today' },
  { query: '2 wednesdays from now', expectedDate: '2025-11-05', description: 'Second Wednesday from today' },
  
  // Time-based queries
  { query: 'tomorrow morning', expectedDate: '2025-10-23', description: 'Tomorrow morning' },
  { query: 'friday afternoon', expectedDate: '2025-10-24', description: 'Friday afternoon' },
  { query: 'next monday at 2pm', expectedDate: '2025-10-27', description: 'Next Monday at 2pm' },
];

console.log('=== Natural Language Date Parsing Tests ===');
console.log(`Reference Date: ${format(MOCK_NOW, 'EEEE, MMMM do, yyyy')} (${TEST_TIMEZONE})`);
console.log('');

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: "${testCase.query}"`);
  console.log(`  Description: ${testCase.description}`);
  console.log(`  Expected: ${testCase.expectedDate}`);
  console.log('');
});

console.log('\nTo run actual tests, deploy the edge function and call it with these queries.');
console.log('Compare the returned parsed_date with the expected dates above.');
