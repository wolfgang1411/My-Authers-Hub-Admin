import { Component, computed, effect, signal, Signal } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSelectModule } from '@angular/material/select';
import { EarningFilter, User } from '../../interfaces';
import { UserService } from '../../services/user';
import { SalesService } from '../../services/sales';
import { Earnings } from '../../interfaces/Earnings';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PayoutsService } from '../../services/payouts';
import Swal from 'sweetalert2';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';

@Component({
  selector: 'app-wallet',
  imports: [
    MatProgressBarModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    CommonModule,
    RouterLink,
    MatDialogModule,
    MatIconModule,
  ],
  templateUrl: './wallet.html',
  styleUrl: './wallet.css',
})
export class Wallet {
  constructor(
    private userService: UserService,
    private salesService: SalesService,
    private payoutService: PayoutsService,
    private matDialog: MatDialog
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
    effect(() => {
      console.log(this.loggedInUser(), 'logged inuser');
    });
  }
  filter: EarningFilter = {
    page: 1,
    itemsPerPage: 30,
    searchStr: '',
  };
  loggedInUser!: Signal<User | null>;
  earningList = signal<Earnings[]>([]);
  lastPage = signal(1);
  uniquePlatformsCount = computed(() => {
    const earnings = this.earningList();
    const uniquePlatforms = Array.from(
      new Set(earnings.map((e) => e.platform))
    );
    return uniquePlatforms.length;
  });
  totalPaid = computed(() => {
    return this.earningList()
      .filter((e) => e.status === 'PAID')
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  });

  totalPending = computed(() => {
    return this.earningList()
      .filter((e) => e.status !== 'PAID')
      .reduce((sum, e) => sum + (e.amount ?? 0), 0);
  });

  totalPaidFormatted = computed(() => this.totalPaid().toFixed(2));
  totalPendingFormatted = computed(() => this.totalPending().toFixed(2));

  ngOnInit() {
    this.updateEarningList();
  }

  async updateEarningList() {
    if (this.loggedInUser()) {
      if (this.loggedInUser()?.auther !== null) {
        this.filter = {
          authorIds: this.loggedInUser()?.auther?.id,
        };
      }
      if (this.loggedInUser()?.publisher !== null) {
        this.filter = {
          publisherIds: this.loggedInUser()?.publisher?.id,
        };
      }
    }

    const { items, totalCount, itemsPerPage, page } =
      await this.salesService.fetchEarnings(this.filter);

    this.earningList.update((earningList) =>
      page > 1 && earningList.length ? [...earningList, ...items] : items
    );
    this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
  }
  onClickRequestPayout() {
    const wallet = this.loggedInUser()?.wallet;
    if (!wallet) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'You do not have a wallet assigned to you',
      });
      return;
    }

    const availableAmount = wallet.totalAmount - wallet.holdAmount;
    if (availableAmount <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Your wallet does not have enough amount to make a payout request',
      });
      return;
    }
    const dialog = this.matDialog.open(InviteDialog, {
      data: {
        heading: 'Payout request',
        label: `Request amount (Max ${availableAmount} INR)`,
        type: 'number',
        onClose: () => dialog.close(),
        onSave: async (val: string | number) => {
          val = Number(val);
          if (!val || val <= 0 || val > availableAmount) {
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Invalid value',
            });
            return;
          }

          try {
            const res = await this.payoutService.requestPayout({
              requestedAmount: val,
            });
            const user = this.loggedInUser();
            this.userService.setLoggedInUser({
              ...user,
              wallet: user?.wallet
                ? {
                    ...user?.wallet,
                    holdAmount: user.wallet.holdAmount + val,
                  }
                : undefined,
            });
            if (res) {
              Swal.fire({
                icon: 'success',
                title: 'Requested',
                text: 'Withdrawal request has been sent to admin for approval',
              });
            }
            dialog.close();
          } catch (error) {
            console.log(error);
          }
        },
      },
    });
  }
}
