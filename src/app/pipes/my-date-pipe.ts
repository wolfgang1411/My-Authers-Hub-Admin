import { formatDate } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'myDate',
})
export class MyDatePipe implements PipeTransform {
  transform(
    value?: string | null,
    format = 'dd-MM-yyyy',
    defaultText?: string
  ) {
    if (!value) return defaultText || '';

    return formatDate(value, format || 'medium', 'en-US');
  }
}
