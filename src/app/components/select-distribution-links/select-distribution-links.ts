import { Component, inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import {
  ApproveTitleGroup,
  ApproveTitlePayload,
  TitleDistribution,
  TitleDistributionGroup,
} from '../../interfaces';
import {
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
} from '@angular/forms';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-select-distribution-links',
  imports: [
    SharedModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
  ],
  templateUrl: './select-distribution-links.html',
  styleUrl: './select-distribution-links.css',
})
export class SelectDistributionLinks implements OnInit {
  constructor(private translateService: TranslateService) {}

  data = inject<Inputs>(MAT_DIALOG_DATA);

  form = new FormGroup({
    distribution: new FormArray<FormGroup<ApproveTitleGroup>>([]),
  });

  ngOnInit(): void {
    this.data.distribution.forEach((dis) => {
      this.form.controls.distribution.push(this.createDistributionGroup(dis));
    });
  }

  createDistributionGroup(distribution: TitleDistribution) {
    return new FormGroup<ApproveTitleGroup>({
      distributionType: new FormControl(distribution.type, {
        nonNullable: true,
      }),
      link: new FormControl(),
    });
  }

  async onSubmit() {
    if (!this.form.valid) return;

    const distributionWithoutLink = this.form.controls.distribution.value
      .filter(({ link }) => !link || !link.length)
      .map(({ distributionType }) =>
        this.translateService.instant(distributionType || '')
      );

    if (distributionWithoutLink.length) {
      const { value } = await Swal.fire({
        icon: 'warning',
        title: this.translateService.instant('missingdistributionwarningtitle'),
        html: this.translateService.instant('missingdistributionwarninghtml', {
          distribution: distributionWithoutLink.join(','),
        }),
        showCancelButton: true,
        cancelButtonText: this.translateService.instant('cancel'),
        confirmButtonText: this.translateService.instant('skipandcontinue'),
        customClass: {
          confirmButton: '!bg-accent',
          cancelButton: '!bg-primary',
        },
      });

      if (!value) return;
    }

    const data = this.form.controls.distribution.value
      .map(({ distributionType, link }) => ({
        distributionType: distributionType as any,
        link: link as string,
      }))
      .filter(({ link }) => link && link.length);

    // this.data.onSave(data);
  }
}

interface Inputs {
  distribution: TitleDistribution[];
  onClose: () => void;
  onSave: (data: ApproveTitlePayload[]) => void;
}
