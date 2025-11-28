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
import { BookBindings, UpdateBindingType } from '../../../interfaces';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-binding-type-manager',
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
  templateUrl: './binding-type-manager.html',
  styleUrl: './binding-type-manager.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BindingTypeManager {
  sizeCategoryId = input.required<number>();
  bindingTypes = input.required<BookBindings[]>();
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
    const bindingData: UpdateBindingType & { sizeCategoryId: number } = {
      name: formValue.name!,
      price: formValue.price!,
      sizeCategoryId: this.sizeCategoryId(),
    };

    try {
      await this.settingsService.createOrUpdateBindingType(bindingData);
      this.isAdding.set(false);
      this.form.reset();
      this.onUpdate.emit();
      await Swal.fire({
        icon: 'success',
        title: await firstValueFrom(this.translateService.get('success')),
        text: await firstValueFrom(this.translateService.get('bindingtypecreated')),
      });
    } catch (error) {
      console.error('Error creating binding type:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorcreatingbindingtype')),
      });
    }
  }

  startEditing(bindingType: BookBindings) {
    this.editingId.set(bindingType.id);
    this.form.patchValue({
      name: bindingType.name,
      price: bindingType.price,
    });
  }

  cancelEditing() {
    this.editingId.set(null);
    this.form.reset();
  }

  async update(bindingType: BookBindings) {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const formValue = this.form.value;
    const updateData: UpdateBindingType & { sizeCategoryId: number } = {
      id: bindingType.id,
      name: formValue.name!,
      price: formValue.price!,
      sizeCategoryId: this.sizeCategoryId(),
    };

    try {
      await this.settingsService.createOrUpdateBindingType(updateData);
      this.editingId.set(null);
      this.form.reset();
      this.onUpdate.emit();
      await Swal.fire({
        icon: 'success',
        title: await firstValueFrom(this.translateService.get('success')),
        text: await firstValueFrom(this.translateService.get('bindingtypeupdated')),
      });
    } catch (error) {
      console.error('Error updating binding type:', error);
      await Swal.fire({
        icon: 'error',
        title: await firstValueFrom(this.translateService.get('error')),
        text: await firstValueFrom(this.translateService.get('errorupdatingbindingtype')),
      });
    }
  }

  async delete(bindingType: BookBindings) {
    const { isConfirmed } = await Swal.fire({
      icon: 'warning',
      title: await firstValueFrom(this.translateService.get('deletebindingtype')),
      text: await firstValueFrom(this.translateService.get('areyousuredelete')),
      showCancelButton: true,
      confirmButtonText: await firstValueFrom(this.translateService.get('delete')),
      cancelButtonText: await firstValueFrom(this.translateService.get('cancel')),
    });

    if (isConfirmed) {
      try {
        await this.settingsService.createOrUpdateBindingType({
          id: bindingType.id,
          name: bindingType.name,
          price: bindingType.price,
        });
        // Note: API might need a delete endpoint
        this.onUpdate.emit();
        await Swal.fire({
          icon: 'success',
          title: await firstValueFrom(this.translateService.get('success')),
          text: await firstValueFrom(this.translateService.get('bindingtypedeleted')),
        });
      } catch (error) {
        console.error('Error deleting binding type:', error);
        await Swal.fire({
          icon: 'error',
          title: await firstValueFrom(this.translateService.get('error')),
          text: await firstValueFrom(this.translateService.get('errordeletingbindingtype')),
        });
      }
    }
  }

  isEditing(id: number): boolean {
    return this.editingId() === id;
  }
}


