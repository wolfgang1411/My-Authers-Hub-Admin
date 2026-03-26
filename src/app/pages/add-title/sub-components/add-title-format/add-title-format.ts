import {
  Component,
  Input,
  ChangeDetectionStrategy,
  output,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { SvgIconComponent } from 'angular-svg-icon';
import { RouterModule } from '@angular/router';
import { PublishingType } from '../../../../interfaces';

@Component({
  selector: 'app-add-title-format',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    SvgIconComponent,
    RouterModule,
  ],
  templateUrl: './add-title-format.html',
  styleUrl: './add-title-format.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AddTitleFormat {
  form = input.required<FormGroup>();

  onDocumentsReady = output();

  PublishingType = PublishingType;

  printingTypes = signal([
    {
      label: 'print&ebook',
      value: PublishingType.PRINT_EBOOK,
      icon: '/images/print-ebook.svg',
      list: [
        'Full Cover (PDF, CMYK) — 20 MB limit',
        'Print Interior (PDF/A compliant, embedded fonts) — 10 MB limit',
        'Front Cover (JPG/PNG) — 2 MB limit',
        'Back Cover (JPG/PNG) — 2 MB limit (optional)',
      ],
    },
    {
      label: 'printbookonly',
      value: PublishingType.ONLY_PRINT,
      icon: '/images/print.svg',
      list: [
        'Full Cover (PDF, CMYK) — 20 MB limit',
        'Print Interior (PDF/A compliant, embedded fonts) — 10 MB limit',
        'Front Cover (JPG/PNG) — 2 MB limit',
        'Back Cover (JPG/PNG) — 2 MB limit (optional)',
      ],
    },
    {
      label: 'ebookonly',
      value: PublishingType.ONLY_EBOOK,
      icon: '/images/ebook.svg',
      list: [
        'Print Interior (PDF/A compliant, embedded fonts) — 10 MB limit',
        'Front Cover (JPG/PNG) — 2 MB limit',
        'Ms Word File for EBook',
      ],
    },
  ]);

  setPublishingType(type: PublishingType) {
    this.form().get('publishingType')?.setValue(type);
  }

  onSelectDocumentsReady() {
    this.form().get('hasFiles')?.setValue(true);
  }

  setPrintingFormat(format: 'publish&print' | 'printOnly') {
    this.form().get('printingFormat')?.setValue(format);
    this.onDocumentsReady.emit();
  }
}
