import { TestBed } from '@angular/core/testing';

import { S3 } from './s3';

describe('S3', () => {
  let service: S3;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(S3);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
