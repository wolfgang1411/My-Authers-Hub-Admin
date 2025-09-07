import { TestBed } from '@angular/core/testing';

import { BankDetailService } from './bank-detail-service';

describe('BankDetailService', () => {
  let service: BankDetailService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BankDetailService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
