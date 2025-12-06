import { Directive } from '@angular/core';
import { NgControl } from '@angular/forms';
import { cleanIsbn } from '../shared/utils/isbn.utils';

@Directive({
  selector: '[appIsbnClean]',
})
export class IsbnClean {
  constructor(private control: NgControl) {}

  clean() {
    const val = this.control.control?.value;
    this.control.control?.setValue(cleanIsbn(val), { emitEvent: false });
  }
}
