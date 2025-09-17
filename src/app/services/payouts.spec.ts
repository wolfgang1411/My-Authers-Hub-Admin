import { TestBed } from '@angular/core/testing';

import { Payouts } from './payouts';

describe('Payouts', () => {
  let service: Payouts;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Payouts);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
