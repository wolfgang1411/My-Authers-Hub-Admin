import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function startsWithValidator(prefix: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value?.toUpperCase?.().trim?.() || '';
    if (!value) return null; // skip if empty, let 'required' handle that
    return value.startsWith(prefix.toUpperCase())
      ? null
      : { startsWith: { requiredPrefix: prefix, actualValue: value } };
  };
}
