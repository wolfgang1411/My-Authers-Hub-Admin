import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  AbstractControl,
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { BookBindings, LaminationType } from '../../interfaces';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-title-printing',
  imports: [
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatInputModule,
    MatIconModule,
    MatCardModule,
  ],
  templateUrl: './title-printing.html',
  styleUrl: './title-printing.css',
})
export class TitlePrinting {
  @Input() bindingType!: BookBindings[];
  @Input() laminationTypes!: LaminationType[];
  @Input() titleForm!: FormGroup;
  @Input() printing!: FormArray;
  @Input() documentMedia!: FormArray;
  @Input() _formBuilder!: FormBuilder;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  ngOnInit() {
    this.printing.controls.forEach((group, index) => {
      this.setupAutoCalculations(group as FormGroup, index);
    });
    this.printing.valueChanges.subscribe(() => {
      this.printing.controls.forEach((group, index) => {
        this.setupAutoCalculations(group as FormGroup, index);
      });
    });
  }

  setupAutoCalculations(group: FormGroup, index: number) {
    group.get('colorPages')?.valueChanges.subscribe((color) => {
      const total = group.get('totalPages')?.value || 0;
      let finalColorPages = color || 0;
      if (group.get('isColorPagesRandom')?.value) {
        finalColorPages = finalColorPages * 2;
      }
      group.get('colorPages')?.setValue(finalColorPages, { emitEvent: false });
      group
        .get('bwPages')
        ?.setValue(total - finalColorPages, { emitEvent: false });
    });
    group.get('isColorPagesRandom')?.valueChanges.subscribe((isRandom) => {
      const color = group.get('colorPages')?.value || 0;
      let finalColorPages = color;

      if (isRandom) {
        finalColorPages = color * 2;
      }

      const total = group.get('totalPages')?.value || 0;
      group
        .get('bwPages')
        ?.setValue(total - finalColorPages, { emitEvent: false });
    });
  }

  createDocumentMediaGroup(
    mediaType: string,
    file: File,
    url: string | null = null
  ): FormGroup {
    return this._formBuilder.group({
      id: [0],
      mediaType: [mediaType],
      file: [file],
      url: [url],
    });
  }
  openFileDialog() {
    if (this.fileInput) {
      this.fileInput.nativeElement.click();
    }
  }
  onInsideCoverUpload(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const index = this.documentMedia.controls.findIndex(
      (ctrl) => ctrl.get('mediaType')?.value === 'InsideCover'
    );
    if (index > -1) {
      this.documentMedia.removeAt(index);
    }
    const newGroup = this.createDocumentMediaGroup('InsideCover', file);
    this.documentMedia.push(newGroup);
    input.value = '';
  }
  getFilteredLaminationTypes(print: AbstractControl): any[] {
    const bindingTypeId = print.get('bindingTypeId')?.value;
    if (!this.laminationTypes?.length) return [];

    // find bindingTypeName by id if needed (depends on how your API gives data)
    const bindingTypeName = this.getBindingTypeNameById(bindingTypeId);

    if (bindingTypeName === 'Paperback') {
      return this.laminationTypes; // allow all
    }

    return this.laminationTypes.filter((t) => t.name !== 'Velvet');
  }
  getLaminationControl(printGroup: AbstractControl): FormControl {
    return printGroup.get('laminationTypeId') as FormControl;
  }
  private getBindingTypeNameById(id: number | null): string | null {
    if (!id) return null;
    const binding = this.bindingType?.find((b) => b.id === id);
    return binding ? binding.name : null;
  }

  removeInsideCover(index: number) {
    this.documentMedia.removeAt(index);
  }

  urlFromFile(file: File): string {
    return URL.createObjectURL(file);
  }
  filteredLaminationTypes(): LaminationType[] {
    const bindingType = this.printing.at(0).get('bindingTypeId')?.value;
    if (!bindingType || !this.laminationTypes) {
      return this.laminationTypes ?? [];
    }
    // Velvet allowed only for Paperback
    if (bindingType === 'Paperback') {
      return this.laminationTypes.filter((t) => t.name === 'Velvet');
    }

    // All others
    return this.laminationTypes;
  }
}
