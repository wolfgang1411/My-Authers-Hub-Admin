import { TestBed } from '@angular/core/testing';

import { IsbnService } from './isbn-service';

describe('IsbnService', () => {
  let service: IsbnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(IsbnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
