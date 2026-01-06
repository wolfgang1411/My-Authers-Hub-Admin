import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
} from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  CreatePlatformIdentifier,
  PlatFormIndetifierGroup,
  PublishingType,
  TitleDistribution,
} from '../../interfaces';
import { PlatformService } from '../../services/platform';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AddPlatformLinkDialog } from '../add-platform-link-dialog/add-platform-link-dialog';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-approve-title',
  imports: [
    MatDialogModule,
    SharedModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatTooltipModule,
  ],
  templateUrl: './approve-title.html',
  styleUrl: './approve-title.css',
})
export class ApproveTitle implements OnInit {
  platformService = inject(PlatformService);
  matDialog = inject(MatDialog);
  translateService = inject(TranslateService);
  cdr = inject(ChangeDetectorRef);
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    skuNumber: new FormControl<string | null>(null, [Validators.required]),
    platformIdentifier: new FormArray<FormGroup<PlatFormIndetifierGroup>>([]),
  });

  async ngOnInit(): Promise<void> {
    // Fetch platforms including inventory platforms before prefilling
    try {
      await this.platformService.fetchPlatforms({ includeInventory: true });
    } catch (error) {
      console.error('Error fetching platforms:', error);
    }

    // Use setTimeout to defer form updates to next change detection cycle
    setTimeout(() => {
      this.prefillPlatformIdentifierForm();
      if (this.data.isEditMode && this.data.skuNumber) {
        this.form.controls.skuNumber.setValue(this.data.skuNumber);
      }
      this.cdr.detectChanges();
    }, 0);
  }
  get skuInvalid(): boolean {
    const control = this.form.controls.skuNumber;
    return control.invalid && (control.touched || control.dirty);
  }

  prefillPlatformIdentifierForm() {
    const allPlatforms = this.platformService.platforms();
    const publishingType = this.data.publishingType;
    const existing = this.data.existingIdentifiers ?? [];

    // First, loop through non-inventory platforms and prefill them
    let platforms = allPlatforms.filter((p) => !p.isInventoryPlatform);

    if (publishingType === PublishingType.ONLY_EBOOK) {
      platforms = platforms.filter((p) => p.isEbookPlatform);
    } else if (publishingType === PublishingType.ONLY_PRINT) {
      platforms = platforms.filter((p) => !p.isEbookPlatform);
    }

    const addedPlatformNames = new Set<string>();

    platforms.forEach((platform) => {
      const platformType = platform.isEbookPlatform ? 'EBOOK' : 'PRINT';
      const match = existing.find(
        (pi) =>
          pi.platformName === platform.name &&
          (pi.type === platformType || !pi.type)
      );

      addedPlatformNames.add(platform.name);

      this.form.controls.platformIdentifier.push(
        new FormGroup<PlatFormIndetifierGroup>({
          platformName: new FormControl<string | null>(platform.name),
          type: new FormControl<'EBOOK' | 'PRINT'>(
            platformType as 'EBOOK' | 'PRINT',
            { nonNullable: true }
          ),
          distributionLink: new FormControl<string | null>(
            match?.distributionLink ?? null
          ),
        })
      );
    });

    // Then, loop through existing identifiers and only add inventory platforms that have links
    existing.forEach((existingIdentifier) => {
      // Skip if already added (non-inventory platform)
      if (addedPlatformNames.has(existingIdentifier.platformName)) {
        return;
      }

      // Check if this is an inventory platform
      const platform = allPlatforms.find(
        (p) => p.name === existingIdentifier.platformName
      );

      // Only add if it's an inventory platform AND has a distribution link
      const isInventoryPlatform = platform?.isInventoryPlatform || false;
      const hasDistributionLink = !!existingIdentifier.distributionLink;

      if (isInventoryPlatform && hasDistributionLink) {
        const platformType = existingIdentifier.type ||
          (platform?.isEbookPlatform ? 'EBOOK' : 'PRINT');

        this.form.controls.platformIdentifier.push(
          new FormGroup<PlatFormIndetifierGroup>({
            platformName: new FormControl<string | null>(
              existingIdentifier.platformName
            ),
            type: new FormControl<'EBOOK' | 'PRINT'>(
              platformType as 'EBOOK' | 'PRINT',
              { nonNullable: true }
            ),
            distributionLink: new FormControl<string | null>(
              existingIdentifier.distributionLink ?? null
            ),
          })
        );
      }
    });
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      return;
    }

    const platformIdentifier = (
      this.form.value.platformIdentifier?.filter(
        ({ distributionLink }) => !!distributionLink?.length
      ) as CreatePlatformIdentifier[]
    ).map((v) => {
      return {
        ...v,
        distributionLink: v.distributionLink?.length
          ? v.distributionLink
          : undefined,
      };
    });

    this.data.onSubmit({
      skuNumber: this.form.value.skuNumber ?? undefined,
      platformIdentifier,
    });
  }

  getExistingPlatformNames(): string[] {
    return this.form.controls.platformIdentifier.controls
      .map((control) => control.controls.platformName.value)
      .filter((name): name is string => !!name);
  }

  async onAddPlatform(): Promise<void> {
    try {
      const dialog = this.matDialog.open(AddPlatformLinkDialog, {
        width: '500px',
        maxWidth: '95vw',
        data: {
          existingPlatformNames: this.getExistingPlatformNames(),
          onAdd: (data: {
            platformName: string;
            type: 'EBOOK' | 'PRINT';
            distributionLink?: string;
          }) => {
            // Check if platform already exists in form
            const existingIndex = this.form.controls.platformIdentifier.controls.findIndex(
              (control) => control.controls.platformName.value === data.platformName
            );

            if (existingIndex >= 0) {
              // Update existing platform identifier
              const existingControl =
                this.form.controls.platformIdentifier.controls[existingIndex];
              existingControl.controls.type.setValue(data.type);
              if (data.distributionLink) {
                existingControl.controls.distributionLink.setValue(
                  data.distributionLink
                );
              }
            } else {
              // Add new platform identifier
              this.form.controls.platformIdentifier.push(
                new FormGroup<PlatFormIndetifierGroup>({
                  platformName: new FormControl<string | null>(
                    data.platformName
                  ),
                  type: new FormControl<'EBOOK' | 'PRINT'>(
                    data.type,
                    { nonNullable: true }
                  ),
                  distributionLink: new FormControl<string | null>(
                    data.distributionLink ?? null
                  ),
                })
              );
            }

            // Force change detection to update the UI
            this.cdr.markForCheck();
            this.cdr.detectChanges();
          },
        },
      });
    } catch (error) {
      console.error('Error opening add platform dialog:', error);
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
  }
}

interface Inputs {
  onSubmit: (data: {
    skuNumber?: string;
    platformIdentifier: CreatePlatformIdentifier[];
  }) => void;
  existingIdentifiers: CreatePlatformIdentifier[];
  distribution: TitleDistribution[];
  onClose: () => void;
  publishingType?: PublishingType;
  isEditMode?: boolean;
  skuNumber?: string;
}
