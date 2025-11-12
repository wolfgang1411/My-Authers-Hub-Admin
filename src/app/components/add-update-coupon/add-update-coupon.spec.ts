import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateCoupon } from './add-update-coupon';

describe('AddUpdateCoupon', () => {
  let component: AddUpdateCoupon;
  let fixture: ComponentFixture<AddUpdateCoupon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdateCoupon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpdateCoupon);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
