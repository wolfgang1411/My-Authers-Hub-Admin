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
  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    platformIdentifier: new FormArray<FormGroup<PlatFormIndetifierGroup>>([]),
  });

  get gridStyle(): { [key: string]: string } {
    const columnCount = this.form.controls.platformIdentifier.controls.length + 1;
    return {
      'grid-template-columns': `repeat(${columnCount}, minmax(0, 1fr))`,
    };
  }

  ngOnInit(): void {
    const allPlatforms = Object.keys(
      this.staticValueService.staticValues()?.PlatForm || {}
    ) as PlatForm[];

    // Filter platforms based on publishing type
    const publishingType = this.data.publishingType;
    const isOnlyEbook = publishingType === PublishingType.ONLY_EBOOK;
    const isOnlyPrint = publishingType === PublishingType.ONLY_PRINT;

    const ebookPlatforms: PlatForm[] = [
      PlatForm.MAH_EBOOK,
      PlatForm.KINDLE,
      PlatForm.GOOGLE_PLAY,
    ];
    const printPlatforms: PlatForm[] = [
      PlatForm.AMAZON,
      PlatForm.FLIPKART,
      PlatForm.MAH_PRINT,
    ];

    let platforms: PlatForm[];
    if (isOnlyEbook) {
      // For ebook-only titles, only show ebook platforms
      platforms = allPlatforms.filter((platform) =>
        ebookPlatforms.includes(platform)
      );
    } else if (isOnlyPrint) {
      // For print-only titles, only show print platforms
      platforms = allPlatforms.filter((platform) =>
        printPlatforms.includes(platform)
      );
    } else {
      // For PRINT_EBOOK, show all platforms
      platforms = allPlatforms;
    }

    platforms.forEach((platform) => {
      this.form.controls.platformIdentifier.push(
        new FormGroup({
          platform: new FormControl(platform, { nonNullable: true }),
          type: new FormControl(this.getPlatformType(platform), {
            nonNullable: true,
          }),
          uniqueIdentifier: new FormControl(''),
          distributionLink: new FormControl(''),
        })
      );
    });
  }

  getPlatformType(platform: PlatForm): BookingType {
    switch (platform) {
      case PlatForm.GOOGLE_PLAY:
      case PlatForm.KINDLE:
      case PlatForm.MAH_EBOOK:
        return BookingType.EBOOK;
      default:
        return BookingType.PRINT;
    }
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
