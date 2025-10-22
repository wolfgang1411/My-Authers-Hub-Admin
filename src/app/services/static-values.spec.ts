import { TestBed } from '@angular/core/testing';

import { StaticValues } from './static-values';

describe('StaticValues', () => {
  let service: StaticValues;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(StaticValues);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
