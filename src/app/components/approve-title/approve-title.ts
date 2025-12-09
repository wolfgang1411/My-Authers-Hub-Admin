import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
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
  ],
  templateUrl: './approve-title.html',
  styleUrl: './approve-title.css',
})
export class ApproveTitle implements OnInit {
  platformService = inject(PlatformService);
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    skuNumber: new FormControl<string | null>(null, [Validators.required]),
    platformIdentifier: new FormArray<FormGroup<PlatFormIndetifierGroup>>([]),
  });

  ngOnInit(): void {
    this.prefillPlatformIdentifierForm();
    if (this.data.isEditMode && this.data.skuNumber) {
      this.form.controls.skuNumber.setValue(this.data.skuNumber);
    }
  }

  prefillPlatformIdentifierForm() {
    const allPlatforms = this.platformService.platforms();
    const publishingType = this.data.publishingType;

    let platforms = allPlatforms;

    if (publishingType === PublishingType.ONLY_EBOOK) {
      platforms = platforms.filter((p) => p.isEbookPlatform);
    } else if (publishingType === PublishingType.ONLY_PRINT) {
      platforms = platforms.filter((p) => !p.isEbookPlatform);
    }

    const existing = this.data.existingIdentifiers ?? [];

    platforms.forEach((platform) => {
      const platformType = platform.isEbookPlatform ? 'EBOOK' : 'PRINT';
      const match = existing.find(
        (pi) =>
          pi.platformName === platform.name &&
          (pi.type === platformType || !pi.type)
      );
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
  }

  onSubmit() {
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
