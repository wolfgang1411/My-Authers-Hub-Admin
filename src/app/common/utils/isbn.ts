/**
 * Formats ISBN-13 with hyphens in standard format: 978-0-439-06487-3
 * Standard grouping: prefix-registration group-registrant-publication-check digit
 * Format: 978-X-XXX-XXXXX-X (for English-language books with 1-digit registration group)
 * If ISBN already has hyphens, returns as-is
 * IMPORTANT: If ISBN starts with BCBL (auto-generated codes), returns as-is without modification
 * @param isbn - ISBN string (with or without hyphens)
 * @returns Formatted ISBN with hyphens, or original if BCBL-prefixed or not a standard ISBN-13
 */
export function formatIsbn13(isbn: string | null | undefined): string | null {
  if (!isbn) {
    return null;
  }

  // CRITICAL: If ISBN starts with BCBL (auto-generated codes), return as-is without any modification
  if (isbn.toUpperCase().startsWith('BCBL')) {
    return isbn;
  }

  // Remove existing hyphens and spaces
  const digitsOnly = isbn.replace(/[-\s]/g, '');

  // If not 13 digits, return original
  if (digitsOnly.length !== 13) {
    return isbn;
  }

  // Check if already formatted (has hyphens)
  if (isbn.includes('-')) {
    return isbn;
  }

  // Standard ISBN-13 format: 978-0-439-06487-3
  // Format: prefix (3) - registration group (1) - registrant (3) - publication (5) - check digit (1)
  // This pattern works for most English-language books (registration group 0 or 1)
  return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 4)}-${digitsOnly.substring(4, 7)}-${digitsOnly.substring(7, 12)}-${digitsOnly.substring(12)}`;
}

