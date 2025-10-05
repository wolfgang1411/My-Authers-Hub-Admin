import { Component, input, output, signal } from '@angular/core';
import { FormArray, FormGroup } from '@angular/forms';
import { TitleDistributionGroup } from '../interfaces';
import { SharedModule } from '../modules/shared/shared-module';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { DistributionType } from '../interfaces/Distribution';

@Component({
  selector: 'app-title-distribution',
  imports: [SharedModule, MatCardModule, MatIconModule, MatButtonModule],
  templateUrl: './title-distribution.html',
  styleUrl: './title-distribution.css',
})
export class TitleDistribution {
  distributionControl =
    input.required<FormArray<FormGroup<TitleDistributionGroup>>>();

  onClickPurchasePoint = output<DistributionType>();

  animateBuyButton = signal<DistributionType | null>(null);

  onClickDistribution(group: FormGroup<TitleDistributionGroup>) {
    const isSelected = group.controls.isSelected.value;
    const availablePoints = group.controls.availablePoints.value;

    console.log({
      isSelected,
      availablePoints,
    });

    if (isSelected) {
      group.controls.isSelected.setValue(false);
      return;
    }

    if (availablePoints) {
      group.controls.isSelected.setValue(true);
    } else {
      this.animateBuyButton.set(group.controls.type.value);
      setTimeout(() => {
        this.animateBuyButton.set(null);
      }, 1000);

      group.setErrors({
        invalid: `No Publising points for ${group.controls.name.value}`,
      });
    }
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
    }
  }

  onClickBuy(type: DistributionType) {
    this.onClickPurchasePoint.emit(type);
  }
}
