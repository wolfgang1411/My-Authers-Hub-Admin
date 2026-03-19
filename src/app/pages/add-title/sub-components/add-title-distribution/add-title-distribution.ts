import { Component, input, output, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BuyAssignPointsButton } from '../../../../components/buy-assign-points-button/buy-assign-points-button';
import { PublishingType } from '../../../../interfaces';
import {
  DistributionType,
  TitleDistributionGroup,
  TitleFormGroup,
} from '../../../../interfaces';
import { TitleService } from '../../../titles/title-service';
import { PlatformService } from '../../../../services/platform';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MatError } from '@angular/material/input';

import { TitleStatus } from '../../../../interfaces';

@Component({
  selector: 'app-add-title-distribution',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    MatIconModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    BuyAssignPointsButton,
    MatError,
  ],
  templateUrl: './add-title-distribution.html',
  styleUrl: './add-title-distribution.css',
})
export class AddTitleDistribution {
  distributionArray =
    input.required<FormArray<FormGroup<TitleDistributionGroup>>>();
  addTitleForm = input.required<FormGroup<TitleFormGroup>>();
  titleId = input<number | null>(null);

  publisherId = input<number | undefined>(undefined);
  publisherName = input<string | undefined>(undefined);
  returnUrl = input<string | undefined>(undefined);
  isHardBoundAllowed = input<boolean>(false);
  publishingType = input<PublishingType | null>(null);
  titleStatus = input<TitleStatus | null>(null);
  accessLevel = input<string>('');

  submitComplete = output<void>();
  onPointsPurchased = output<void>();
  
  isLoading = signal(false);
  animateBuyButton = signal<DistributionType | null>(null);

  private readonly titleService = inject(TitleService);
  private readonly platformService = inject(PlatformService);
  private readonly router = inject(Router);

  readonly DistributionType = DistributionType;

  toggleDistribution(index: number) {
    const group = this.distributionArray().at(index);
    const isSelected = group.controls.isSelected.value;
    const availablePoints = group.controls.availablePoints.value;
    const selectedType = group.controls.type.value;
    const hasId = group.controls.id.value;

    // MAH is mandatory for ONLY_EBOOK and cannot be toggled off
    if (selectedType === DistributionType.MAH) {
      group.controls.isSelected.setValue(true, { emitEvent: false });
      return;
    }

    // Cannot remove already created distributions
    if (hasId && isSelected) {
      return;
    }

    if (isSelected) {
      group.controls.isSelected.setValue(false);
      return;
    }

    if (!availablePoints) {
      this.animateBuyButton.set(selectedType);
      setTimeout(() => {
        this.animateBuyButton.set(null);
      }, 1000);

      group.setErrors({
        invalid: `No Publishing points for ${group.controls.name.value}`,
      });
      return;
    }

    // Make National and Hardbound_National mutually exclusive
    if (
      selectedType === DistributionType.National ||
      selectedType === DistributionType.Hardbound_National
    ) {
      const otherType =
        selectedType === DistributionType.National
          ? DistributionType.Hardbound_National
          : DistributionType.National;

      // Deselect and disable the other type if selected
      const otherGroup = this.distributionArray().controls.find(
        (g) => g.controls.type.value === otherType,
      );
      if (otherGroup) {
        if (otherGroup.controls.isSelected.value) {
          otherGroup.controls.isSelected.setValue(false);
        }
      }
    }

    group.controls.isSelected.setValue(true);
  }

  shouldHideDistribution(group: FormGroup<TitleDistributionGroup>): boolean {
    const type = group.controls.type.value;
    const hasId = group.controls.id.value;
    const pubType = this.publishingType();

    // Don't hide if it's already created (has id) - show it but disabled
    if (hasId) {
      return false;
    }

    // ONLY_EBOOK: show only MAH
    if (pubType === PublishingType.ONLY_EBOOK) {
      return type !== DistributionType.MAH;
    }

    const hardBoundAllowed = this.isHardBoundAllowed();

    // If hardbound is NOT allowed
    if (!hardBoundAllowed) {
      // Always show National
      if (type === DistributionType.National) {
        return false;
      }
      // Never show Hardbound_National
      if (type === DistributionType.Hardbound_National) {
        return true;
      }
      return false;
    }

    // If hardbound IS allowed - check selection state and creation state
    const controls = this.distributionArray().controls;
    const nationalGroup = controls.find(
      (g) => g.controls.type.value === DistributionType.National,
    );
    const hardboundGroup = controls.find(
      (g) => g.controls.type.value === DistributionType.Hardbound_National,
    );

    const nationalIsSelected = nationalGroup?.controls.isSelected.value === true;
    const hardboundIsSelected = hardboundGroup?.controls.isSelected.value === true;

    const nationalHasId =
      typeof nationalGroup?.controls.id.value === 'number' &&
      nationalGroup.controls.id.value > 0;

    const hardboundHasId =
      typeof hardboundGroup?.controls.id.value === 'number' &&
      hardboundGroup.controls.id.value > 0;

    // For National: hide if Hardbound is selected OR already created
    if (type === DistributionType.National) {
      return hardboundIsSelected || hardboundHasId;
    }

    // For Hardbound_National: hide if National is selected OR already created
    if (type === DistributionType.Hardbound_National) {
      return nationalIsSelected || nationalHasId;
    }

    return false;
  }

  isRaisingTicket(): boolean {
    const tId = this.titleId();
    const status = this.titleStatus();
    return (
      (tId || 0) > 0 && 
      status === TitleStatus.APPROVED && 
      this.accessLevel() === 'PUBLISHER'
    );
  }

  async onSubmit() {
    const form = this.distributionArray();
    if (form.invalid) {
      form.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: 'Invalid Form',
        text: 'Please fill all required fields correctly.',
      });
      return;
    }

    const tId = this.titleId();
    if (!tId || tId <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Title ID is required.',
      });
      return;
    }

    // Get selected distributions and remove already existing ones
    // We can tell if it's existing if it has an id
    const existingTypes = form.controls
      .filter((c) => c.controls.id.value)
      .map((c) => c.controls.type.value);

    const distributionsToCreate = form.controls
      .filter(
        ({ controls: { isSelected, type } }) =>
          isSelected.value && type.value && !existingTypes.includes(type.value as DistributionType),
      )
      .map(({ controls: { type } }) => type.value as DistributionType)
      .filter((type): type is DistributionType => !!type);

    if (distributionsToCreate.length === 0 && existingTypes.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Warning',
        text: 'Please select at least one new distribution type before proceeding.',
      });
      return;
    }

    try {
      this.isLoading.set(true);

      // Check if raising ticket for approved title
      if (this.isRaisingTicket()) {
        // If no changes
        if (distributionsToCreate.length === 0) {
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No changes detected. Please make changes before raising a ticket.',
            heightAuto: false,
          });
          return;
        }

        // Create distribution update ticket
        await this.titleService.createTitleDistributionUpdateTicket(
          tId,
          distributionsToCreate,
        );

        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: 'Request has been sent to superadmin for approval.',
        });

        this.submitComplete.emit();
        return;
      }

      if (distributionsToCreate.length > 0) {
        await this.titleService.createTitleDistribution(
          tId,
          distributionsToCreate,
        );
      }

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Title has been sent for approval to the admin.',
      });
      this.submitComplete.emit();
    } catch (error: any) {
      console.error('Error submitting distribution:', error);
      let errorMessage = 'Failed to submit distribution. Please try again.';
      if (error?.error?.message) {
        errorMessage = error.error.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }

      Swal.fire({
        icon: 'error',
        title: 'Submission Failed',
        text: errorMessage,
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  getIconByType(type: DistributionType): string {
    if (type === DistributionType.Global) {
      return 'public';
    }
    return 'storefront';
  }
}
