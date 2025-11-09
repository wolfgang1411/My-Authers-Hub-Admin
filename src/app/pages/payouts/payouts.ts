import { Component, OnInit, Signal, signal } from '@angular/core';
import { PayoutsService } from '../../services/payouts';
import { Payout, PayoutFilter, PayoutStatus } from '../../interfaces/Payout';
import { SharedModule } from '../../modules/shared/shared-module';
import { ListTable } from '../../components/list-table/list-table';
import { RouterModule } from '@angular/router';
import { MatIcon } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { MatTableDataSource } from '@angular/material/table';
import { MatButton, MatIconButton } from '@angular/material/button';
import Swal from 'sweetalert2';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { MatDialog } from '@angular/material/dialog';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';

@Component({
  selector: 'app-payouts',
  imports: [SharedModule, ListTable, RouterModule, MatIcon, MatIconButton],
  templateUrl: './payouts.html',
  styleUrl: './payouts.css',
})
export class Payouts implements OnInit {
  constructor(
    private payoutService: PayoutsService,
    private userService: UserService,
    private matDialog: MatDialog
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnInit(): void {
    this.fetchPayouts();
  }

  loggedInUser!: Signal<User | null>;
  filter: PayoutFilter = {
    page: 1,
    itemsPerPage: 30,
  };
  lastPage = signal<number>(1);

  payouts = signal<Payout[] | null>(null);

  searchStr = new Subject<string>();

  displayedColumns: string[] = [
    'amount',
    'status',
    'user',
    'emailId',
    'accountNo',
    'ifscCode',
    'actions',
  ];
  dataSource = new MatTableDataSource<any>([]);

  setDataSource() {
    this.dataSource.data =
      this.payouts()?.map((payout) => {
        const firstName =
          payout.user.publisher?.name ||
          payout.user.auther?.name ||
          payout.user.firstName ||
          '';
        const email =
          payout.user.publisher?.email ||
          payout.user.auther?.email ||
          payout.user.email ||
          '';

        const accountNo =
          payout.user.publisher?.bankDetails?.[0]?.accountNo ||
          payout.user.auther?.bankDetails?.[0]?.accountNo;

        const ifscCode =
          payout.user.publisher?.bankDetails?.[0]?.ifsc ||
          payout.user.auther?.bankDetails?.[0]?.ifsc;

        return {
          ...payout,
          orderid: '#' + payout.id,
          user: `${firstName} ${payout.user?.lastName || ''}`,
          emailId: email,
          accountNo: accountNo,
          ifscCode: ifscCode,
          amount: payout.requestedAmount + ' ' + 'INR',
        };
      }) || [];
  }
  async fetchPayouts() {
    try {
      const { items, itemsPerPage, totalCount } =
        await this.payoutService.fetchPayouts(this.filter);
      this.payouts.set(items);
      this.lastPage.set(Math.ceil(totalCount / itemsPerPage));
      this.setDataSource();
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  }

  async onUpdatePayout(id: number, status: PayoutStatus) {
    const isReject = status === 'REJECTED';
    const text = isReject
      ? 'You are about to reject this payout request.'
      : 'You are about to approve this payout request.';

    const confirmButtonText = isReject ? 'Yes, reject it!' : 'Yes, approve it!';
    const swalConfig: any = {
      icon: 'warning',
      title: 'Are you sure?',
      text,
      showCancelButton: true,
      confirmButtonText,
      cancelButtonText: 'Cancel',
      confirmButtonColor: isReject ? '#ff6b6b' : '#00397e',
    };

    // Add checkbox only for REJECTED
    if (isReject) {
      swalConfig.input = 'checkbox';
      swalConfig.inputValue = 1; // default checked
      swalConfig.inputPlaceholder = 'Refund hold amount to user';
      swalConfig.inputValidator = (value: number) => {
        if (value === 0) {
          return null; // valid even if unchecked
        }
        return null;
      };
    }

    const { value: checkboxValue, isConfirmed } = await Swal.fire(swalConfig);

    if (!isConfirmed) return;

    try {
      // Determine refundHoldAmount only for rejection
      const refundHoldAmount = isReject ? Boolean(checkboxValue) : undefined;

      const payload: any = { status };
      if (refundHoldAmount !== undefined) {
        payload.refundHoldAmount = refundHoldAmount;
      }

      const res = await this.payoutService.updatePayout(id, payload);

      const temp = this.payouts()?.map((payout) =>
        payout.id === id ? res : payout
      );

      this.payouts.set(temp || []);
      this.setDataSource();

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Payout ${status.toLowerCase()} successfully!`,
      });
    } catch (error) {
      console.error(error);
    }
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
            const temp = [res, ...(this.payouts() || [])];
            this.payouts.set(temp);
            this.setDataSource();

            Swal.fire({
              icon: 'success',
              title: 'Requested',
              text: 'Payout request has been sent to admin for approval',
            });
            dialog.close();
          } catch (error) {
            console.log(error);
          }
        },
      },
    });
  }
}
