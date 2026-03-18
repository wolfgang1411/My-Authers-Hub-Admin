import {
  Component,
  Input,
  ChangeDetectionStrategy,
  output,
  input,
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
