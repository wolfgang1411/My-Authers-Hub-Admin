import { TestBed } from '@angular/core/testing';

import { Languages } from './languages';

describe('Languages', () => {
  let service: Languages;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Languages);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
