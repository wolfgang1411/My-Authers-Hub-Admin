import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { SharedModule } from 'src/app/modules/shared/shared-module';
import { AddWalletAmount } from '../add-wallet-amount/add-wallet-amount';
import { WalletService } from 'src/app/services/wallet';
import { RazorpayService } from 'src/app/services/razorpay';

@Component({
  selector: 'app-add-wallet-amount-button',
  imports: [SharedModule, MatButtonModule],
  templateUrl: './add-wallet-amount-button.html',
  styleUrl: './add-wallet-amount-button.css',
})
export class AddWalletAmountButton {
  label = input('addwalletamount');

  matDialog = inject(MatDialog);
  walletService = inject(WalletService);
  razorpayService = inject(RazorpayService);

  authorId = input<number | null>(null);
  publisherId = input<number | null>(null);

  onPaymentFinish = output<AddWalletAmountButtonResposne>();

  onClickAddAmount() {
    const dialog = this.matDialog.open(AddWalletAmount, {
      data: {
        onClose: () => dialog.close(),
        onSubmit: async (data: {
          amount: number;
          method?: 'GATEWAY' | 'WALLET';
          sendMails: boolean;
        }) => {
          const { amount, currency, orderId, status } =
            await this.walletService.addWalletAmount({
              amount: data.amount,
              method: data.method || 'SUPERADMIN',
              sendMail: data.sendMails,
              authorId: this.authorId() ? Number(this.authorId()) : undefined,
              publisherId: this.publisherId()
                ? Number(this.publisherId())
                : undefined,
            });

          if (status === 'success') {
            this.onPaymentFinish.emit({
              amount: data.amount,
              method: data.method || 'WALLET',
              status: 'completed',
            });
            dialog.close();
            return;
          }

          if (status === 'pending') {
            await this.razorpayService.pay(
              { order_id: orderId, amount, currency },
              {
                handler: async (d: RazorpayPaymentResponse) => {
                  const { status } =
                    await this.walletService.verifyWalletAmountTransaction({
                      ...d,
                      status: 'completed',
                    });
                  dialog.close();
                  this.onPaymentFinish.emit({
                    amount: data.amount,
                    method: data.method || 'GATEWAY',
                    status,
                  });
                },
                ondismiss: async () => {
                  await this.walletService.verifyWalletAmountTransaction({
                    razorpay_order_id: orderId,
                    status: 'cancelled',
                  });
                  dialog.close();
                  this.onPaymentFinish.emit({
                    amount: data.amount,
                    method: data.method || 'GATEWAY',
                    status: 'cancelled',
                  });
                },
              },
            );
          }
        },
      },
    });
  }
}

export interface AddWalletAmountButtonResposne {
  amount: number;
  method: 'WALLET' | 'GATEWAY';
  status: 'failed' | 'completed' | 'cancelled';
}
