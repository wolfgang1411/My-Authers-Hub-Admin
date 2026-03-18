import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  DistributionType,
  TitleDistributionGroup,
  TitleFormGroup,
} from '../../../../interfaces';
import { TitleService } from '../../../titles/title-service';
import { PlatformService } from '../../../../services/platform';
import { Router } from '@angular/router';
import { signal, output, inject } from '@angular/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-add-title-distribution',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatIconModule,
    MatCheckboxModule,
  ],
  templateUrl: './add-title-distribution.html',
  styleUrl: './add-title-distribution.css',
})
export class AddTitleDistribution {
  distributionArray =
    input.required<FormArray<FormGroup<TitleDistributionGroup>>>();
  addTitleForm = input.required<FormGroup<TitleFormGroup>>();
  titleId = input<number | null>(null);

  submitComplete = output<void>();
  isLoading = signal(false);

  private readonly titleService = inject(TitleService);
  private readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);

  readonly DistributionType = DistributionType;

  toggleDistribution(index: number) {
    const control = this.distributionArray().at(index).controls.isSelected;
    control.setValue(!control.value);
  }

  async onSubmit() {
    const form = this.addTitleForm();
    if (form.invalid) {
      form.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Form',
        text: 'Please fill all required fields correctly.',
      });
      return;
    }

    try {
      this.isLoading.set(true);
      const val: any = form.getRawValue();

      // Map the simplified authorRoyalties into the standard royalties structure
      const authorRoyaltiesArray = val.authorRoyalties || [];
      const mappedRoyalties: any[] = [];
      const platformObjects = this.platformService.platforms();

      let pubPercent = 100;

      val.pricing.forEach((pricingCtrl: any) => {
        const platformObj = platformObjects.find(pl => pl.name === pricingCtrl.platform);
        if (platformObj && pricingCtrl.salesPrice >= 0) { // Only set royalties for active platform pricing
          let totalAuthorPercent = 0;
          
          authorRoyaltiesArray.forEach((authorData: any) => {
            if (authorData.authorId) {
              const pct = authorData.percentage || 0;
              totalAuthorPercent += pct;
              mappedRoyalties.push({
                platform: platformObj.name,
                authorId: authorData.authorId,
                percentage: pct
              });
            }
          });
          
          pubPercent = Math.max(0, 100 - totalAuthorPercent);

          if (val.titleDetails.publisher?.id) {
            mappedRoyalties.push({
              platform: platformObj.name,
              publisherId: val.titleDetails.publisher.id,
              percentage: pubPercent
            });
          }
        }
      });

      // Construct the final payload
      const payload: any = {
        ...val.titleDetails,
        publishingType: val.publishingType,
        authorIds: val.titleDetails.authorIds.map((a: any) => ({
          id: a.id,
          displayName: a.displayName, // Correctly use displayName
          allowAuthorCopy: a.allowAuthorCopy,
        })),
        printing: val.printing,
        pricing: val.pricing.map((p: any) => ({
          id: p.id,
          platformId: this.platformService.platforms().find(pl => pl.name === p.platform)?.id,
          salesPrice: p.salesPrice,
          mrp: p.mrp,
        })).filter((p: any) => !!p.platformId),
        royalties: mappedRoyalties,
        distribution: val.distribution
          .filter((d: any) => d.isSelected)
          .map((d: any) => d.type),
      };

      if (this.titleId()) {
        payload.id = this.titleId();
      }

      const response = await this.titleService.createTitle(payload);
      if (response) {
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: this.titleId() ? 'Title updated successfully!' : 'Title created successfully!',
        });
        this.submitComplete.emit();
      }
    } catch (error) {
      console.error('Error submitting title:', error);
      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: 'An error occurred while saving the title.',
      });
    } finally {
      this.isLoading.set(false);
    }
  }
}
