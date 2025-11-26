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
  BookingType,
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

  get gridStyle(): { [key: string]: string } {
    const columnCount = this.form.controls.platformIdentifier.controls.length + 1;
    return {
      'grid-template-columns': `180px repeat(${columnCount - 1}, minmax(150px, 1fr))`,
      'min-width': 'max-content',
    };
  }

  ngOnInit(): void {
    const allPlatforms = this.platformService.platforms();

    // Filter platforms based on publishing type
    const publishingType = this.data.publishingType;
    const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
    const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;

    let platforms: typeof allPlatforms;
    if (isOnlyEbook) {
      // For ebook-only titles, only show ebook platforms
      platforms = allPlatforms.filter((p) => p.type === 'EBOOK');
    } else if (isOnlyPrint) {
      // For print-only titles, only show print platforms
      platforms = allPlatforms.filter((p) => p.type === 'PRINT');
    } else {
      // For PRINT_EBOOK, show all platforms
      platforms = allPlatforms;
    }

    platforms.forEach((platform) => {
      this.form.controls.platformIdentifier.push(
        new FormGroup({
          platform: new FormControl<string | null | undefined>(platform.name),
          type: new FormControl(this.getPlatformType(platform.name), {
            nonNullable: true,
          }),
          uniqueIdentifier: new FormControl<string | null>(''),
          distributionLink: new FormControl<string | null>(''),
        })
      );
    });
  }

  getPlatformType(platformName: string): BookingType {
    const platform = this.platformService.getPlatformByName(platformName);
    return platform?.type || BookingType.PRINT;
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
  distribution: TitleDistribution[];
  onClose: () => void;
  publishingType?: PublishingType;
}
