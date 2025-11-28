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
import { MatCardModule } from '@angular/material/card';
import { SharedModule } from '../../../modules/shared/shared-module';
import { SettingsService } from '../../../services/settings';
import { LaminationType, UpdateLaminationType } from '../../../interfaces';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-lamination-type-manager',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatCardModule,
    SharedModule,
  ],
  templateUrl: './lamination-type-manager.html',
  styleUrl: './lamination-type-manager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LaminationTypeManager {
  sizeCategoryId = input.required<number>();
  laminationTypes = input.required<LaminationType[]>();
  onUpdate = output<void>();

  displayedColumns: string[] = ['name', 'price', 'actions'];
  isAdding = signal<boolean>(false);
  editingId = signal<number | null>(null);

  form = new FormGroup({
    name: new FormControl<string>('', [Validators.required]),
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
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
    const laminationData: UpdateLaminationType & { sizeCategoryId: number } = {
      name: formValue.name!,
      price: formValue.price!,
      sizeCategoryId: this.sizeCategoryId(),
    };

    try {
      await this.settingsService.createOrUpdateLaminationType(laminationData);
      this.isAdding.set(false);
      this.form.reset();
      this.onUpdate.emit();
      await Swal.fire({
        icon: 'success',
        title: await firstValueFrom(this.translateService.get('success')),
        text: await firstValueFrom(this.translateService.get('laminationtypecreated')),
      });
    } catch (error) {
      console.error('Error creating lamination type:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorcreatinglaminationtype')),
      });
    }
  }

  startEditing(laminationType: LaminationType) {
    this.editingId.set(laminationType.id);
    this.form.patchValue({
      name: laminationType.name,
      price: laminationType.price,
    });
  }

  cancelEditing() {
    this.editingId.set(null);
    this.form.reset();
  }

  async update(laminationType: LaminationType) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const updateData: UpdateLaminationType & { sizeCategoryId: number } = {
      id: laminationType.id,
      name: formValue.name!,
      price: formValue.price!,
      sizeCategoryId: this.sizeCategoryId(),
    };

    try {
      await this.settingsService.createOrUpdateLaminationType(updateData);
      this.editingId.set(null);
      this.form.reset();
      this.onUpdate.emit();
      await Swal.fire({
        icon: 'success',
        title: await firstValueFrom(this.translateService.get('success')),
        text: await firstValueFrom(this.translateService.get('laminationtypeupdated')),
      });
    } catch (error) {
      console.error('Error updating lamination type:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorupdatinglaminationtype')),
      });
    }
  }

  async delete(laminationType: LaminationType) {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: await firstValueFrom(this.translateService.get('deletelaminationtype')),
      text: await firstValueFrom(this.translateService.get('areyousuredelete')),
      showCancelButton: true,
      confirmButtonText: await firstValueFrom(this.translateService.get('delete')),
      cancelButtonText: await firstValueFrom(this.translateService.get('cancel')),
    });

    if (isConfirmed) {
      try {
        await this.settingsService.createOrUpdateLaminationType({
          id: laminationType.id,
          name: laminationType.name,
          price: laminationType.price,
        });
        this.onUpdate.emit();
        await Swal.fire({
          icon: 'success',
          title: await firstValueFrom(this.translateService.get('success')),
          text: await firstValueFrom(this.translateService.get('laminationtypedeleted')),
        });
      } catch (error) {
        console.error('Error deleting lamination type:', error);
        await Swal.fire({
          icon: 'error',
          title: await firstValueFrom(this.translateService.get('error')),
          text: await firstValueFrom(this.translateService.get('errordeletelaminationtype')),
        });
      }
    }
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }
}


