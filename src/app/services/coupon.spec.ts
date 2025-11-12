import { TestBed } from '@angular/core/testing';

import { Coupon } from './coupon';

describe('Coupon', () => {
  let service: Coupon;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Coupon);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
