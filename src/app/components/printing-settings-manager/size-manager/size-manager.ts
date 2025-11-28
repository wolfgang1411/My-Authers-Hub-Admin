import {
  Component,
  input,
  output,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { SharedModule } from '../../../modules/shared/shared-module';
import { SettingsService } from '../../../services/settings';
import { Size, CreateSize, UpdateSize } from '../../../interfaces';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-size-manager',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatCardModule,
    SharedModule,
  ],
  templateUrl: './size-manager.html',
  styleUrl: './size-manager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SizeManager {
  sizeCategoryId = input.required<number>();
  sizes = input.required<Size[]>();
  onUpdate = output<void>();

  displayedColumns: string[] = ['size', 'width', 'length', 'actions'];
  isAdding = signal<boolean>(false);
  editingId = signal<number | null>(null);

  form = new FormGroup({
    size: new FormControl<string>('', [Validators.required]),
    width: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    length: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });

  constructor(
    private settingsService: SettingsService,
    private translateService: TranslateService
  ) {}

  startAdding() {
    this.isAdding.set(true);
    this.form.reset();
  }

  cancelAdding() {
    this.isAdding.set(false);
    this.form.reset();
  }

  async save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const sizeData: CreateSize = {
      size: formValue.size!,
      width: formValue.width!,
      length: formValue.length!,
      sizeCategoryId: this.sizeCategoryId(),
    };

    try {
      await this.settingsService.createSize(sizeData);
      this.isAdding.set(false);
      this.form.reset();
      this.onUpdate.emit();
      await Swal.fire({
        icon: 'success',
        title: await firstValueFrom(this.translateService.get('success')),
        text: await firstValueFrom(this.translateService.get('sizecreated')),
      });
    } catch (error) {
      console.error('Error creating size:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorcreatingsize')),
      });
    }
  }

  startEditing(size: Size) {
    this.editingId.set(size.id);
    this.form.patchValue({
      size: size.size,
      width: size.width,
      length: size.length,
    });
  }

  cancelEditing() {
    this.editingId.set(null);
    this.form.reset();
  }

  async update(size: Size) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const updateData: UpdateSize = {
      id: size.id,
      size: formValue.size!,
      width: formValue.width!,
      length: formValue.length!,
      sizeCategoryId: this.sizeCategoryId(),
    };

    try {
      await this.settingsService.updateSize(size.id, updateData);
      this.editingId.set(null);
      this.form.reset();
      this.onUpdate.emit();
      await Swal.fire({
        icon: 'success',
        title: await firstValueFrom(this.translateService.get('success')),
        text: await firstValueFrom(this.translateService.get('sizeupdated')),
      });
    } catch (error) {
      console.error('Error updating size:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorupdatingsize')),
      });
    }
  }

  async delete(size: Size) {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: await firstValueFrom(this.translateService.get('deletesize')),
      text: await firstValueFrom(this.translateService.get('areyousuredelete')),
      showCancelButton: true,
      confirmButtonText: await firstValueFrom(this.translateService.get('delete')),
      cancelButtonText: await firstValueFrom(this.translateService.get('cancel')),
    });

    if (isConfirmed) {
      try {
        await this.settingsService.deleteSize(size.id);
        this.onUpdate.emit();
        await Swal.fire({
          icon: 'success',
          title: await firstValueFrom(this.translateService.get('success')),
          text: await firstValueFrom(this.translateService.get('sizedeleted')),
        });
      } catch (error) {
        console.error('Error deleting size:', error);
        await Swal.fire({
          icon: 'error',
          title: await firstValueFrom(this.translateService.get('error')),
          text: await firstValueFrom(this.translateService.get('errordeletingsize')),
        });
      }
    }
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }
}


