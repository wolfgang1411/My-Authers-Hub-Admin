import { TestBed } from '@angular/core/testing';

import { WalletTransaction } from './wallet-transaction';

describe('WalletTransaction', () => {
  let service: WalletTransaction;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WalletTransaction);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
