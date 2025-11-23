import { Component, input, output, signal } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { DistributionType, TitleDistributionGroup } from '../../../interfaces';
import { SharedModule } from '../../../modules/shared/shared-module';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatError } from '@angular/material/input';

@Component({
  selector: 'app-temp-title-distribution',
  imports: [
    SharedModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatError,
  ],
  templateUrl: './temp-title-distribution.html',
  styleUrl: './temp-title-distribution.css',
})
export class TempTitleDistribution {
  distributionControl =
    input.required<FormArray<FormGroup<TitleDistributionGroup>>>();

  onClickPurchasePoint = output<DistributionType>();

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
   * Hide Hardbound_National if National is selected/created, and vice versa
   */
  shouldHideDistribution(group: FormGroup<TitleDistributionGroup>): boolean {
    const type = group.controls.type.value;
    const hasId = group.controls.id.value;

    // Don't hide if it's already created (has id) - show it but disabled
    if (hasId) {
      return false;
    }

    // Check if the opposite type is selected or already created
    if (type === DistributionType.National) {
      const hardboundGroup = this.distributionControl().controls.find(
        (g) => g.controls.type.value === DistributionType.Hardbound_National
      );
      return (
        hardboundGroup?.controls.isSelected.value === true ||
        hardboundGroup?.controls.id.value !== null
      );
    }

    if (type === DistributionType.Hardbound_National) {
      const nationalGroup = this.distributionControl().controls.find(
        (g) => g.controls.type.value === DistributionType.National
      );
      return (
        nationalGroup?.controls.isSelected.value === true ||
        nationalGroup?.controls.id.value !== null
      );
    }

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
