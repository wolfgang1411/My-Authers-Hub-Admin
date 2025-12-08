import * as XLSX from 'xlsx';

/**
 * Export data to Excel file
 * @param data Array of objects to export
 * @param headers Object mapping column keys to display names (optional)
 * @param fileName Name of the Excel file (without extension)
 * @param sheetName Name of the Excel sheet (default: 'Sheet1')
 */
export function exportToExcel<T extends Record<string, any>>(
  data: T[],
  fileName: string,
  headers?: Record<keyof T, string>,
  sheetName: string = 'Sheet1'
): void {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    // Prepare data for Excel
    const worksheetData: any[] = [];

    // Add headers row
    const firstRow = data[0];
    const columnKeys = Object.keys(firstRow) as Array<keyof T>;
    
    const headerRow: string[] = columnKeys.map((key) => {
      return headers?.[key] || String(key);
    });
    worksheetData.push(headerRow);

    // Add data rows
    data.forEach((row) => {
      const dataRow: any[] = columnKeys.map((key) => {
        const value:any = row[key];
        // Handle null/undefined values
        if (value === null || value === undefined) {
          return '';
        }
        // Handle dates
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        // Return value as-is
        return value;
      });
      worksheetData.push(dataRow);
    });

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Auto-size columns
    const columnWidths = columnKeys.map((key) => {
      const header = headers?.[key] || String(key);
      const maxLength = Math.max(
        header.length,
        ...data.map((row) => {
          const value = row[key];
          return value ? String(value).length : 0;
        })
      );
      return { wch: Math.min(maxLength + 2, 50) }; // Max width of 50
    });
    worksheet['!cols'] = columnWidths;

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate Excel file and download
    const excelBuffer = XLSX.write(workbook, {
      bookType: 'xlsx',
      type: 'array',
    });

    const blob = new Blob([excelBuffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
}

