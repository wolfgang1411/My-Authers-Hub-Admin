import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class RazorpayService {
  private loaded = false;

  private load(): Promise<void> {
    if (this.loaded) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => {
        this.loaded = true;
        resolve();
      };
      script.onerror = () => reject('Razorpay SDK failed to load');
      document.body.appendChild(script);
    });
  }

  async pay(
    requestData: Omit<RazorpayOptions, 'key' | 'handler' | 'modal' | 'theme'>,
    callbacks: {
      handler: (resposne: RazorpayPaymentResponse) => void;
      ondismiss?: () => void;
    },
  ) {
    await this.load();

    const { amount, currency, description, name, order_id } = requestData;

    const options: RazorpayOptions = {
      key: environment.razorpayKey, // injected here
      amount,
      currency,
      order_id,
      name,
      description,
      handler: callbacks.handler,
      modal: {
        ondismiss: callbacks.ondismiss || (() => {}),
      },

      theme: {
        color: '#6a1ecf',
      },
    };

    const rzp = new Razorpay(options);
    rzp.open();
  }
}
