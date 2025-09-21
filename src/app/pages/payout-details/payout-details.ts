import { Component, OnInit, signal, Signal } from '@angular/core';
import { PayoutsService } from '../../services/payouts';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { ActivatedRoute } from '@angular/router';
import { Payout } from '../../interfaces/Payout';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatList, MatListItem } from '@angular/material/list';
import { MyDatePipe } from '../../pipes/my-date-pipe';

@Component({
  selector: 'app-payout-details',
  imports: [SharedModule, MatList, MatListItem, MyDatePipe],
  templateUrl: './payout-details.html',
  styleUrl: './payout-details.css',
})
export class PayoutDetails implements OnInit {
  constructor(
    private payoutService: PayoutsService,
    userService: UserService,
    route: ActivatedRoute
  ) {
    this.loggedInUser = userService.loggedInUser$;
    route.params.subscribe(({ id }) => {
      this.payoutId = Number(id);
    });
  }

  payoutId!: number;
  loggedInUser!: Signal<User | null>;
  payout = signal<Payout | null>(null);

  userDetails = signal<{ name: string; email: string; phone: string } | null>(
    null
  );

  addressDetails = signal<{
    address: string;
    city: string;
    pincode: string;
    state: string;
    country: string;
  } | null>(null);

  bankDetails = signal<{
    accountNo: string;
    ifsc: string;
    name: string;
    accountType: string;
  } | null>(null);

  async ngOnInit() {
    try {
      const res = await this.payoutService.fetchPayout(this.payoutId);
      this.payout.set(res);
      this.userDetails.set({
        name: res.user.publisher?.name || res.user.auther?.name || 'N/A',
        email: res.user.publisher?.email || res.user.auther?.email || 'N/A',
        phone:
          res.user.publisher?.phoneNumber ||
          res.user.auther?.phoneNumber ||
          res.user.phoneNumber ||
          'N/A',
      });
      const address =
        res.user.publisher?.address[0] || res.user.auther?.address[0];
      this.addressDetails.set({
        address: address?.address || 'N/A',
        city: address?.city || 'N/A',
        country: address?.country || 'N/A',
        pincode: address?.pincode || 'N/A',
        state: address?.state || 'N/A',
      });

      const bankDetails =
        res.user.publisher?.bankDetails?.[0] ||
        res.user.auther?.bankDetails?.[0];
      this.bankDetails.set({
        accountNo: bankDetails?.accountNo || '',
        accountType: bankDetails?.accountType || '',
        ifsc: bankDetails?.ifsc || '',
        name: bankDetails?.name || '',
      });
    } catch (error) {
      console.log(error);
    }
  }
}
