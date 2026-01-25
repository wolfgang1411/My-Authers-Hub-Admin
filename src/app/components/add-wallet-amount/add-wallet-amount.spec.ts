import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddWalletAmount } from './add-wallet-amount';

describe('AddWalletAmount', () => {
  let component: AddWalletAmount;
  let fixture: ComponentFixture<AddWalletAmount>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddWalletAmount]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddWalletAmount);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
