import { Component, inject, OnInit } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { PlatformService } from '../../services/platform';
import { Platform } from '../../interfaces/Platform';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-platform-link-dialog',
  imports: [
    MatDialogModule,
    SharedModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatRadioModule,
  ],
  templateUrl: './add-platform-link-dialog.html',
  styleUrl: './add-platform-link-dialog.css',
})
export class AddPlatformLinkDialog implements OnInit {
  platformService = inject(PlatformService);
  dialogRef = inject(MatDialogRef<AddPlatformLinkDialog>);
  translateService = inject(TranslateService);
  data = inject<Inputs>(MAT_DIALOG_DATA);

  selectionMode = signal<'existing' | 'new'>('existing');
  availablePlatforms = signal<Platform[]>([]);

  form = new FormGroup({
    platformName: new FormControl<string | null>(null, [Validators.required]),
    type: new FormControl<'EBOOK' | 'PRINT'>('PRINT', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    distributionLink: new FormControl<string | null>(null),
  });

  ngOnInit(): void {
    this.loadAvailablePlatforms();
    
    // Watch for selection mode changes
    this.selectionMode.set(this.data.defaultMode || 'existing');
    
    // Reset form when selection mode changes
    this.form.controls.platformName.setValue(null);
    this.form.controls.platformName.markAsUntouched();
  }

  async loadAvailablePlatforms(): Promise<void> {
    try {
      // Fetch all platforms including inventory platforms (needed to check if platforms are inventory)
      await this.platformService.fetchPlatforms({ includeInventory: true });
      const allPlatforms = this.platformService.platforms();

      // Show all platforms (ebook, print, and inventory) for selection
      // Users should be able to select any platform to add links
      const combined = allPlatforms;

      // Filter out already added platforms and ensure platform has a valid name
      const existingNames = this.data.existingPlatformNames ?? [];
      const available = combined.filter(
        (p) => p.name && p.name.trim() !== '' && !existingNames.includes(p.name)
      );

      this.availablePlatforms.set(available);
    } catch (error) {
      console.error('Error loading platforms:', error);
    }
  }

  getPlatformType(platform: Platform): 'EBOOK' | 'PRINT' {
    return platform.isEbookPlatform ? 'EBOOK' : 'PRINT';
  }

  onPlatformSelect(platform: Platform): void {
    this.form.controls.platformName.setValue(platform.name);
    this.form.controls.type.setValue(this.getPlatformType(platform));
  }

  onSelectionModeChange(mode: 'existing' | 'new'): void {
    this.selectionMode.set(mode);
    this.form.controls.platformName.setValue(null);
    this.form.controls.platformName.markAsUntouched();

    // Platform name is always required
    this.form.controls.platformName.setValidators([Validators.required]);
    this.form.controls.platformName.updateValueAndValidity();
  }

  async onSubmit(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      return;
    }

    const platformName = this.form.controls.platformName.value;
    const type = this.form.controls.type.value;
    const distributionLink = this.form.controls.distributionLink.value;

    if (!platformName) {
      return;
    }

    // If creating new platform, create it first
    if (this.selectionMode() === 'new') {
      try {
        const newPlatform = await this.platformService.createPlatform({
          name: platformName,
          marginPercent: 0, // Default margin
          isEbookPlatform: type === 'EBOOK',
          isInventoryPlatform: true, // Always set to true when creating from linking dialog
        });

        // Update available platforms list
        await this.loadAvailablePlatforms();

        // Call the callback with the new platform identifier
        // Use setTimeout to ensure UI updates after platform creation
        setTimeout(() => {
          this.data.onAdd({
            platformName: newPlatform.name,
            type,
            distributionLink: distributionLink || undefined,
          });
          this.dialogRef.close();
        }, 100);
      } catch (error) {
        console.error('Error creating platform:', error);
        const errorMessage =
          this.translateService.instant('error') || 'An error occurred';
        Swal.fire({
          icon: 'error',
          title: errorMessage,
          text:
            this.translateService.instant('erroraddingplatform') ||
            'Error adding platform',
        });
      }
    } else {
      // Using existing platform
      this.data.onAdd({
        platformName,
        type,
        distributionLink: distributionLink || undefined,
      });

      this.dialogRef.close();
    }
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

interface Inputs {
  onAdd: (data: {
    platformName: string;
    type: 'EBOOK' | 'PRINT';
    distributionLink?: string;
  }) => void;
  existingPlatformNames?: string[];
  defaultMode?: 'existing' | 'new';
}

