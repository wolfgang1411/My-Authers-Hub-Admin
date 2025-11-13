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

  ngOnInit(): void {
    const platforms = Object.keys(
      this.staticValueService.staticValues()?.PlatForm || {}
    ) as PlatForm[];

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
    const platformIdentifier = this.form.value.platformIdentifier?.filter(
      ({ uniqueIdentifier }) => !!uniqueIdentifier?.length
    ) as CreatePlatformIdentifier[];

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
}
