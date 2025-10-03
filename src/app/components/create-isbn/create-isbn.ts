import { Component, effect, inject, signal } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { createIsbn, IsbnType, Title } from '../../interfaces';
import { TitleService } from '../../pages/titles/title-service';
import { IsbnService } from '../../services/isbn-service';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';

@Component({
  standalone: true,
  selector: 'app-create-isbn',
  imports: [
    MatDialogContent,
    MatFormFieldModule,
    MatSelectModule,
    SharedModule,
    ReactiveFormsModule,
    MatDialogActions,
    MatInputModule,
    MatButtonModule,
    MatDialogModule,
  ],
  templateUrl: './create-isbn.html',
  styleUrl: './create-isbn.css',
})
export class CreateIsbn {
  constructor(
    private titleService: TitleService,
    private isbnService: IsbnService
  ) {
    effect(async () => {
      const { items: titles } = await this.titleService.getTitles();
      this.titleList.set(titles);
    });
  }
  data = inject<Inputs>(MAT_DIALOG_DATA);
  titleList = signal<Title[] | null>(null);

  createIsbnForm = new FormGroup({
    isbnNumber: new FormControl<string | null>('', [
      Validators.required,
      Validators.pattern(/^(97(8|9))?\d{9}(\d|X)$/),
    ]),
    type: new FormControl<IsbnType | null>(null, [Validators.required]),
    titleId: new FormControl<number | null>(null),
  });

  ngOnInit() {}
  async onSubmit() {
    if (this.createIsbnForm.valid) {
      try {
        const isbnDetails = this.createIsbnForm.value;
        const isbnNumber = this.createIsbnForm.get('isbnNumber')?.value;
        const result = await this.isbnService.verifyIsbn(isbnNumber as string);
        if (result.verified) {
          this.data.onSubmit(isbnDetails as createIsbn);
          this.createIsbnForm.get('isbnNumber')?.setErrors(null);
        } else {
          this.createIsbnForm
            .get('isbnNumber')
            ?.setErrors({ invalidIsbn: true });
        }
      } catch (err) {
        console.error('ISBN verification failed', err);
        this.createIsbnForm.get('isbnNumber')?.setErrors({ invalidIsbn: true });
      }
    }
  }
}
interface Inputs {
  onSubmit: (createIsbn: createIsbn) => void;
  onClose: () => void;
}
