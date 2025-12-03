import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import {
  ApproveTitleGroup,
  CreateDistributionLink,
  CreatePlatformIdentifier,
  DistributionType,
  PlatForm,
  PlatFormIndetifierGroup,
  PublishingType,
  TitleDistribution,
} from '../../interfaces';
import { StaticValuesService } from '../../services/static-values';
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
  staticValueService = inject(StaticValuesService);
  platformService = inject(PlatformService);
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    platformIdentifier: new FormArray<FormGroup<PlatFormIndetifierGroup>>([]),
  });

  ngOnInit(): void {
    this.prefillPlatformIdentifierForm();
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
          pi.platform === platform.name &&
          (pi.type === platformType || !pi.type)
      );
      this.form.controls.platformIdentifier.push(
        new FormGroup<PlatFormIndetifierGroup>({
          platform: new FormControl<string | null>(platform.name),
          type: new FormControl<'EBOOK' | 'PRINT'>(
            platformType as 'EBOOK' | 'PRINT',
            { nonNullable: true }
          ),
          uniqueIdentifier: new FormControl<string | null>(
            match?.uniqueIdentifier ?? null
          ),
          distributionLink: new FormControl<string | null>(
            match?.distributionLink ?? null
          ),
        })
      );
    });
  }

  onSubmit() {
    const platformIdentifier = (
      this.form.value.platformIdentifier?.filter(
        ({ uniqueIdentifier, distributionLink }) =>
          !!uniqueIdentifier?.length || !!distributionLink?.length
      ) as CreatePlatformIdentifier[]
    ).map((v) => {
      return {
        ...v,
        distributionLink: v.distributionLink?.length
          ? v.distributionLink
          : undefined,
        uniqueIdentifier: v.uniqueIdentifier?.length
          ? v.uniqueIdentifier
          : undefined,
      };
    });

    if (this.form.valid) {
      this.data.onSubmit({
        platformIdentifier,
      });
    }
  }
}

interface Inputs {
  onSubmit: (data: { platformIdentifier: CreatePlatformIdentifier[] }) => void;
  existingIdentifiers: CreatePlatformIdentifier[];
  distribution: TitleDistribution[];
  onClose: () => void;
  publishingType?: PublishingType;
}
