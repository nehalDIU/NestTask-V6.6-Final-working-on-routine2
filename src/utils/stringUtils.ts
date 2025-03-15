/**
 * Converts a full name to initials.
 * For example, "Sheikh Shariar Nehal" becomes "SSN"
 * 
 * @param name The full name to convert to initials
 * @returns The initials as a string
 */
export function getInitials(name?: any): string {
  // Handle cases where name is undefined, null, or not a string
  if (name === undefined || name === null || typeof name !== 'string' || name.trim() === '') {
    return 'N/A';
  }
  
  // Split the name by spaces and get the first letter of each part
  try {
    return name
      .trim()
      .split(' ')
      .filter(part => part.length > 0) // Filter out empty parts
      .map(part => part.charAt(0).toUpperCase())
      .join('') || 'N/A';  // Return 'N/A' if result is empty
  } catch (error) {
    console.error('Error getting initials:', error);
    return 'N/A';
  }
} 