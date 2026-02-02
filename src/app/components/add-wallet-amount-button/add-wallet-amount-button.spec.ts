import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddWalletAmountButton } from './add-wallet-amount-button';

describe('AddWalletAmountButton', () => {
  let component: AddWalletAmountButton;
  let fixture: ComponentFixture<AddWalletAmountButton>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddWalletAmountButton]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddWalletAmountButton);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
