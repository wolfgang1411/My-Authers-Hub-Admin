import { Component, inject, OnInit, signal } from '@angular/core';
import { Title } from '../../interfaces/Titles';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { TitleService } from '../../pages/titles/title-service';
import { TitleStatus } from '../../interfaces';

@Component({
  selector: 'app-share-title',
  imports: [
    SharedModule,
    MatDialogModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './share-title.html',
  styleUrl: './share-title.css',
})
export class ShareTitle implements OnInit {
  data = inject<Inputs>(MAT_DIALOG_DATA);
  private titleService = inject(TitleService);

  form = new FormGroup({
    titleId: new FormControl<number | null>(null, [Validators.required]),
  });

  titles = signal<Title[]>([]);
  isLoading = signal(false);

  async ngOnInit() {
    await this.fetchTitles();
  }

  async fetchTitles() {
    try {
      this.isLoading.set(true);
      const { items } = await this.titleService.getTitleWithLessDetails({
        status: ['APPROVED'] as any,
      });
      this.titles.set(items);
    } catch (error) {
      console.error('Error fetching titles:', error);
      this.titles.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  onSubmit() {
    if (this.form.valid && this.form.controls.titleId.value) {
      this.data.onSubmit(this.form.controls.titleId.value);
    }
  }
}

interface Inputs {
  onClose: () => void;
  onSubmit: (titleId: number) => void;
}

