import { Pipe, PipeTransform } from '@angular/core';
import { formatIsbn } from '../shared/utils/isbn.utils';

@Pipe({
  name: 'isbnFormat',
})
export class IsbnFormatPipe implements PipeTransform {
  transform(value: string | null): string {
    return value ? formatIsbn(value) : '';
  }
}
