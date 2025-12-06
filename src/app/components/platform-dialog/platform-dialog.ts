import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule } from '@angular/common';
import { PlatformService, PlatformPayload } from '../../services/platform';
import { Platform } from '../../interfaces/Platform';
import { SharedModule } from '../../modules/shared/shared-module';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-platform-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    SharedModule,
  ],
  templateUrl: './platform-dialog.html',
  styleUrl: './platform-dialog.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlatformDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<PlatformDialog>);
  private readonly dialogData = inject<Platform | null>(MAT_DIALOG_DATA);
  private readonly platformService = inject(PlatformService);

  protected readonly isSaving = false;

  protected readonly platformForm = this.fb.group({
    id: this.fb.control<number | null>(null),
    name: this.fb.control('', [Validators.required]),
    marginPercent: this.fb.control<number | null>(0, [
      Validators.required,
      Validators.min(0),
      Validators.max(100),
    ]),
    extraFlatMargin: this.fb.control<number | null>(0),
    isEbookPlatform: this.fb.control(false),
    isSuperAdminPricingOnly: this.fb.control(false),
    isInventoryPlatform: this.fb.control(false),
  });

  ngOnInit() {
    if (this.dialogData) {
      this.platformForm.patchValue({
        id: this.dialogData.id,
        name: this.dialogData.name,
        marginPercent: this.dialogData.marginPercent,
        extraFlatMargin: this.dialogData.extraFlatMargin ?? 0,
        isEbookPlatform: this.dialogData.isEbookPlatform,
        isSuperAdminPricingOnly: this.dialogData.isSuperAdminPricingOnly ?? false,
        isInventoryPlatform: this.dialogData.isInventoryPlatform ?? false,
      });
    }
  }

  async onSave() {
    if (this.platformForm.invalid) {
      this.platformForm.markAllAsTouched();
      return;
    }

    const value = this.platformForm.getRawValue();
    const payload: PlatformPayload = {
      name: value.name?.trim() || '',
      marginPercent: Number(value.marginPercent) || 0,
      extraFlatMargin:
        value.extraFlatMargin === null
          ? undefined
          : Number(value.extraFlatMargin),
      isEbookPlatform: value.isEbookPlatform ?? false,
      isSuperAdminPricingOnly: value.isSuperAdminPricingOnly ?? false,
      isInventoryPlatform: value.isInventoryPlatform ?? false,
    };

    if (!payload.name) {
      Swal.fire({
        icon: 'info',
        title: 'Name required',
        text: 'Platform name cannot be empty.',
      });
      return;
    }

    try {
      if (value.id) {
        await this.platformService.updatePlatform(value.id, payload);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          timer: 1200,
          text: 'Platform updated',
          showConfirmButton: false,
          heightAuto: false,
        });
      } else {
        await this.platformService.createPlatform(payload);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Platform created',
          timer: 1200,
          showConfirmButton: false,
          heightAuto: false,
        });
      }
      this.dialogRef.close(true);
    } catch (error) {
      // Error is handled by the service
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}
