import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PayoutDetails } from './payout-details';

describe('PayoutDetails', () => {
  let component: PayoutDetails;
  let fixture: ComponentFixture<PayoutDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayoutDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PayoutDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
