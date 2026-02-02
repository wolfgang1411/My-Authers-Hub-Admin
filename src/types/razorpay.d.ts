declare class Razorpay {
  constructor(options: RazorpayOptions);
  open(): void;
  close(): void;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  order_id: string;

  name?: string;
  description?: string;
  image?: string;

  handler?: (response: RazorpayPaymentResponse) => void;

  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    backdropclose?: boolean;
  };

  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };

  theme?: {
    color?: string;
  };
}

interface RazorpayPaymentResponse {
  razorpay_payment_id?: string;
  razorpay_order_id: string;
  razorpay_signature?: string;
}
