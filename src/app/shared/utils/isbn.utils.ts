export function cleanIsbn(value: string): string {
  return (value || '').toString().replace(/[^0-9]/g, '');
}

export function formatIsbn(value: string): string {
  if (value) {
    if (value.toLowerCase().startsWith('bcbl-')) {
      return value;
    }
  }

  const digits = cleanIsbn(value);

  if (digits.length === 13) {
    return digits.replace(
      /(\d{3})(\d{1})(\d{4})(\d{4})(\d{1})/,
      '$1-$2-$3-$4-$5'
    );
  }

  return digits;
}
