import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from '../../modules/shared/shared-module';
import { DistributionType } from '../../interfaces';
import { BuyAssignPointsDialog } from '../buy-assign-points-dialog/buy-assign-points-dialog';
import { PublisherService } from '../../pages/publisher/publisher-service';
import { UserService } from '../../services/user';
import { TranslateService } from '@ngx-translate/core';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-buy-assign-points-button',
  imports: [SharedModule, MatButtonModule],
  templateUrl: './buy-assign-points-button.html',
  styleUrl: './buy-assign-points-button.css',
})
export class BuyAssignPointsButton {
  distributionType = input.required<DistributionType>();
  publisherId = input<number | undefined>(undefined);
  publisherName = input<string | undefined>(undefined);
  returnUrl = input<string | undefined>(undefined);
  buttonClass = input<string>('');
  onSuccess = output<void>();

  private readonly dialog = inject(MatDialog);
  private readonly publisherService = inject(PublisherService);
  private readonly userService = inject(UserService);
  private readonly translateService = inject(TranslateService);

  loggedInUser = computed(() => this.userService.loggedInUser$());
  isSuperAdmin = computed(
    () => this.loggedInUser()?.accessLevel === 'SUPERADMIN'
  );
  buttonText = computed(() =>
    this.isSuperAdmin() ? 'Assign Point' : 'Buy Point'
  );

  async onClick(): Promise<void> {
    try {
      const dialogRef = this.dialog.open(BuyAssignPointsDialog, {
        width: '480px',
        maxWidth: '90vw',
        data: {
          distributionType: this.distributionType(),
          isSuperAdmin: this.isSuperAdmin(),
          publisherId: this.publisherId(),
          publisherName: this.publisherName(),
        },
      });

      const points = await dialogRef.afterClosed().toPromise();

      if (points && typeof points === 'number' && points > 0) {
        await this.handleBuyOrAssign(points);
      }
    } catch (error) {
      console.error('Error opening dialog:', error);
    }
  }

  private async handleBuyOrAssign(points: number): Promise<void> {
    try {
      const returnUrl = this.returnUrl() || window.location.href;
      const publisherId = this.publisherId();

      const res = await this.publisherService.buyPublishingPoints(
        this.distributionType(),
        points,
        returnUrl,
        publisherId
      );

      if (res.status === 'pending' && res.url) {
        window.open(res.url, '_blank');
        Swal.fire({
          icon: 'info',
          title:
            this.translateService.instant('redirectingtopayment') ||
            'Redirecting to Payment',
          text:
            this.translateService.instant('youwillberedirectedtopaymentpage') ||
            'You will be redirected to the payment page.',
        });
      }

      if (res.status === 'success') {
        const successMessage = this.isSuperAdmin()
          ? this.translateService.instant('pointssuccessfullyassigned') ||
            'Points successfully assigned to publisher.'
          : this.translateService.instant('purchaserequestsent') ||
            'Purchase request has been sent to admin for approval.';

        Swal.fire({
          icon: 'success',
          title: this.translateService.instant('success'),
          text: successMessage,
        });

        this.onSuccess.emit();
      }
    } catch (error) {
      console.error('Error buying/assigning points:', error);
      const errorMessage =
        this.translateService.instant('errorbuyingpoints') ||
        'Failed to buy/assign points. Please try again.';

      Swal.fire({
        icon: 'error',
        title: this.translateService.instant('error'),
        text: errorMessage,
      });
    }
  }
}
