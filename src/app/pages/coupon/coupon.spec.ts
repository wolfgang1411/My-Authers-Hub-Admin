import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Coupon } from './coupon';

describe('Coupon', () => {
  let component: Coupon;
  let fixture: ComponentFixture<Coupon>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Coupon]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Coupon);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
