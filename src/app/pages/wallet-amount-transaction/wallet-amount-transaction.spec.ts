import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WalletAmountTransaction } from './wallet-amount-transaction';

describe('WalletAmountTransaction', () => {
  let component: WalletAmountTransaction;
  let fixture: ComponentFixture<WalletAmountTransaction>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WalletAmountTransaction]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WalletAmountTransaction);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
