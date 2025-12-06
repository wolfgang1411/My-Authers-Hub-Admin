import { Component, input, output, signal } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { DistributionType, TitleDistributionGroup } from '../../../interfaces';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatError } from '@angular/material/input';
import { BuyAssignPointsButton } from '../../../components/buy-assign-points-button/buy-assign-points-button';

@Component({
  selector: 'app-temp-title-distribution',
  imports: [
    SharedModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatError,
    BuyAssignPointsButton,
  ],
  templateUrl: './temp-title-distribution.html',
  styleUrl: './temp-title-distribution.css',
})
export class TempTitleDistribution {
  distributionControl =
    input.required<FormArray<FormGroup<TitleDistributionGroup>>>();
  publisherId = input<number | undefined>(undefined);
  publisherName = input<string | undefined>(undefined);
  returnUrl = input<string | undefined>(undefined);
  isHardBoundAllowed = input<boolean>(false);

  onClickPurchasePoint = output<DistributionType>();
  onPointsPurchased = output<void>();

  animateBuyButton = signal<DistributionType | null>(null);

  onClickDistribution(group: FormGroup<TitleDistributionGroup>) {
    const isSelected = group.controls.isSelected.value;
    const availablePoints = group.controls.availablePoints.value;
    const selectedType = group.controls.type.value;
    const hasId = group.controls.id.value;

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
        invalid: `No Publising points for ${group.controls.name.value}`,
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
      const otherGroup = this.distributionControl().controls.find(
        (g) => g.controls.type.value === otherType
      );
      if (otherGroup) {
        if (otherGroup.controls.isSelected.value) {
          otherGroup.controls.isSelected.setValue(false);
        }
      }
    }

    group.controls.isSelected.setValue(true);
  }

  /**
   * Check if a distribution option should be hidden
   * Logic:
   * - If hardbound NOT allowed: always show National, never show Hardbound_National
   * - If hardbound IS allowed:
   *   - Show both if neither is selected/created
   *   - Hide the opposite one if one is selected OR already created (has id)
   */
  shouldHideDistribution(group: FormGroup<TitleDistributionGroup>): boolean {
    const type = group.controls.type.value;
    const hasId = group.controls.id.value;

    // Don't hide if it's already created (has id) - show it but disabled
    if (hasId) {
      return false;
    }

    const isHardBoundAllowed = this.isHardBoundAllowed();

    // If hardbound is NOT allowed
    if (!isHardBoundAllowed) {
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
    // Get the distribution controls once to avoid repeated lookups
    const controls = this.distributionControl().controls;
    const nationalGroup = controls.find(
      (g) => g.controls.type.value === DistributionType.National
    );
    const hardboundGroup = controls.find(
      (g) => g.controls.type.value === DistributionType.Hardbound_National
    );

    // Check if groups exist, are selected, or already created (has id)
    const nationalIsSelected =
      nationalGroup?.controls.isSelected.value === true;
    const hardboundIsSelected =
      hardboundGroup?.controls.isSelected.value === true;

    // Check if distributions are already created (have valid id > 0)
    const nationalHasId =
      nationalGroup?.controls.id.value !== null &&
      nationalGroup?.controls.id.value !== undefined &&
      typeof nationalGroup.controls.id.value === 'number' &&
      nationalGroup.controls.id.value > 0;

    const hardboundHasId =
      hardboundGroup?.controls.id.value !== null &&
      hardboundGroup?.controls.id.value !== undefined &&
      typeof hardboundGroup.controls.id.value === 'number' &&
      hardboundGroup.controls.id.value > 0;

    // For National: hide if Hardbound is selected OR already created (has id)
    if (type === DistributionType.National) {
      return hardboundIsSelected || hardboundHasId;
    }

    // For Hardbound_National: hide if National is selected OR already created (has id)
    if (type === DistributionType.Hardbound_National) {
      return nationalIsSelected || nationalHasId;
    }

    // For all other types, don't hide
    return false;
  }

  getIconByType(type: DistributionType) {
    switch (type) {
      case DistributionType.Global:
        return 'public';
      case DistributionType.Audiobook:
        return 'headphones';
      case DistributionType.Hardbound_National:
        return 'menu_book';
      case DistributionType.National:
        return 'flag';
      case DistributionType.National_Prime:
        return 'star';
      default:
        return '';
    }
  }

  onClickBuy(type: DistributionType) {
    this.onClickPurchasePoint.emit(type);
  }
}
