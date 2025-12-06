import { Directive, HostListener } from '@angular/core';
import { NgControl } from '@angular/forms';
import { cleanIsbn, formatIsbn } from '../shared/utils/isbn.utils';

@Directive({
  selector: '[appIsbnFormat]',
})
export class IsbnFormat {
  constructor(private control: NgControl) {}

  @HostListener('input', ['$event'])
  onInput(event: Event) {
    const input = event.target as HTMLInputElement | null;
    if (!input) return;

    let value = input.value.toString(); // FORCE STRING
    const cleaned = cleanIsbn(value); // ALWAYS STRING

    if (cleaned.length < 13) {
      this.control.control?.setValue(cleaned, { emitEvent: false });
      return;
    }

    const formatted = formatIsbn(cleaned);
    this.control.control?.setValue(formatted, { emitEvent: false });
  }
}
