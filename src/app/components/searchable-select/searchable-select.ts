import {
  Component,
  input,
  output,
  signal,
  effect,
  OnDestroy,
  OnInit,
  Signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatError } from '@angular/material/form-field';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CommonModule } from '@angular/common';

export interface SearchableSelectOption {
  label: string;
  value: any;
}

@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatAutocompleteModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatError,
  ],
  templateUrl: './searchable-select.html',
  styleUrl: './searchable-select.css',
})
export class SearchableSelect implements OnInit, OnDestroy {
  // Inputs
  label = input<string>('');
  placeholder = input<string>('Type to search...');
  options = input<SearchableSelectOption[]>([]);
  optionsSignal = input<Signal<SearchableSelectOption[]> | undefined>(
    undefined
  );
  isLoading = input<boolean>(false);
  required = input<boolean>(false);
  disabled = input<boolean>(false);
  displayWith = input<(value: any) => string>();
  formControl = input<FormControl<any>>();

  // Outputs
  searchChange = output<string>();
  selectionChange = output<any>();

  // Internal state
  searchControl = new FormControl<string>('');
  filteredOptions = signal<SearchableSelectOption[]>([]);
  isOpen = signal<boolean>(false);
  private destroy$ = new Subject<void>();

  constructor() {
    // Watch for options changes and sync with form control
    effect(() => {
      const signalInput = this.optionsSignal();
      const opts = signalInput ? signalInput() : this.options();
      const allOptions = opts || [];

      // Get current form control value
      const control = this.formControl();
      const controlValue = control?.value;

      // Always ensure selected value is in options
      let finalOptions = [...allOptions];
      if (controlValue != null) {
        const selectedInOptions = allOptions.find((opt) =>
          this.compareValues(opt.value, controlValue)
        );
        if (!selectedInOptions) {
          // Try to find in current filtered options
          const currentFiltered = this.filteredOptions();
          const existing = currentFiltered.find((opt) =>
            this.compareValues(opt.value, controlValue)
          );
          if (existing) {
            finalOptions = [existing, ...finalOptions];
          }
        }
      }

      this.filteredOptions.set(finalOptions);

      // Update display if we have a value
      if (controlValue != null) {
        this.syncDisplayValue(controlValue, finalOptions);
      }
    });

    // Watch for form control value changes
    effect(() => {
      const control = this.formControl();
      if (control) {
        // Initial sync
        const value = control.value;
        if (value != null) {
          const allOptions = this.getCurrentOptions();
          this.syncDisplayValue(value, allOptions);
        }

        // Watch for changes
        control.valueChanges
          .pipe(takeUntil(this.destroy$))
          .subscribe((value) => {
            if (value != null) {
              const allOptions = this.getCurrentOptions();
              this.syncDisplayValue(value, allOptions);
            } else {
              this.searchControl.setValue('', { emitEvent: false });
            }
          });
      }
    });

    // Setup search
    this.searchControl.valueChanges
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((searchTerm) => {
        if (searchTerm && searchTerm.trim().length > 0) {
          this.filterOptions(searchTerm.trim());
          this.searchChange.emit(searchTerm.trim());
        } else {
          this.resetToAllOptions();
        }
      });
  }

  ngOnInit(): void {
    // Initialize with current options
    const allOptions = this.getCurrentOptions();
    this.filteredOptions.set(allOptions);

    // Sync initial value
    const control = this.formControl();
    if (control?.value != null) {
      this.syncDisplayValue(control.value, allOptions);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private getCurrentOptions(): SearchableSelectOption[] {
    const signal = this.optionsSignal();
    return signal ? signal() : this.options() || [];
  }

  private syncDisplayValue(
    value: any,
    options: SearchableSelectOption[]
  ): void {
    // Don't overwrite user input
    if (
      this.searchControl.value &&
      this.searchControl.value.trim().length > 0
    ) {
      return;
    }

    // Find the option
    let selected = options.find((opt) => this.compareValues(opt.value, value));

    // If not found, try filtered options
    if (!selected) {
      selected = this.filteredOptions().find((opt) =>
        this.compareValues(opt.value, value)
      );
    }

    if (selected) {
      const displayWithFn = this.displayWith();
      const displayText = displayWithFn
        ? displayWithFn(selected.value)
        : selected.label;

      this.searchControl.setValue(displayText, { emitEvent: false });

      // Ensure it's in filtered options
      const currentFiltered = this.filteredOptions();
      const alreadyInList = currentFiltered.find((opt) =>
        this.compareValues(opt.value, selected!.value)
      );
      if (!alreadyInList) {
        this.filteredOptions.set([selected, ...currentFiltered]);
      }
    }
  }

  private filterOptions(searchTerm: string): void {
    const allOptions = this.getCurrentOptions();
    const searchLower = searchTerm.toLowerCase();
    const filtered = allOptions.filter((option) => {
      const label = option.label?.toLowerCase() || '';
      return label.includes(searchLower);
    });

    // Always include selected value
    const control = this.formControl();
    const selectedValue = control?.value;
    if (selectedValue != null) {
      let selected = allOptions.find((opt) =>
        this.compareValues(opt.value, selectedValue)
      );
      if (!selected) {
        selected = this.filteredOptions().find((opt) =>
          this.compareValues(opt.value, selectedValue)
        );
      }
      if (selected) {
        const alreadyInFiltered = filtered.find((opt) =>
          this.compareValues(opt.value, selected!.value)
        );
        if (!alreadyInFiltered) {
          filtered.unshift(selected);
        }
      }
    }

    this.filteredOptions.set(filtered);
  }

  private resetToAllOptions(): void {
    const allOptions = this.getCurrentOptions();
    const control = this.formControl();
    let finalOptions = [...allOptions];

    // Ensure selected value is included
    if (control?.value != null) {
      const selectedInOpts = allOptions.find((opt) =>
        this.compareValues(opt.value, control.value)
      );
      if (!selectedInOpts) {
        const existing = this.filteredOptions().find((opt) =>
          this.compareValues(opt.value, control.value)
        );
        if (existing) {
          finalOptions = [existing, ...finalOptions];
        }
      }
    }

    this.filteredOptions.set(finalOptions);
  }

  onInputFocus(): void {
    this.isOpen.set(true);
    this.resetToAllOptions();
  }

  onInputBlur(): void {
    setTimeout(() => {
      this.isOpen.set(false);
      const control = this.formControl();
      if (control?.value != null) {
        const allOptions = this.getCurrentOptions();
        this.syncDisplayValue(control.value, allOptions);
      }
    }, 200);
  }

  onOptionSelected(selectedValue: any): void {
    const allOptions = this.getCurrentOptions();
    const option = allOptions.find((opt) =>
      this.compareValues(opt.value, selectedValue)
    );

    if (!option) {
      console.warn('Selected value not found in options:', selectedValue);
      return;
    }

    // Update form control
    const control = this.formControl();
    if (control) {
      control.setValue(option.value, { emitEvent: true });
    }

    this.selectionChange.emit(option.value);
    this.isOpen.set(false);
  }

  getDisplayValue = (value: any): string => {
    if (value == null) return '';
    const allOptions = this.getCurrentOptions();
    const option = allOptions.find((opt) =>
      this.compareValues(opt.value, value)
    );
    if (!option) return '';
    const displayWithFn = this.displayWith();
    return displayWithFn ? displayWithFn(option.value) : option.label;
  };

  onInputChange(value: string): void {
    if (!value || value.trim().length === 0) {
      const control = this.formControl();
      if (control) {
        control.setValue(null, { emitEvent: true });
      }
      this.selectionChange.emit(null);
    }
  }

  compareValues(a: any, b: any): boolean {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (typeof a === 'object' && typeof b === 'object') {
      return JSON.stringify(a) === JSON.stringify(b);
    }
    return String(a) === String(b);
  }

  get selectedValue(): any {
    return this.formControl()?.value ?? null;
  }
}
