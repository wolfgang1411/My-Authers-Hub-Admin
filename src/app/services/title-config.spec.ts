import { TestBed } from '@angular/core/testing';

import { TitleConfig } from './title-config';

describe('TitleConfig', () => {
  let service: TitleConfig;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TitleConfig);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
