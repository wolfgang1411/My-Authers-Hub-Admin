import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublisherFilter } from './publisher-filter';

describe('PublisherFilter', () => {
  let component: PublisherFilter;
  let fixture: ComponentFixture<PublisherFilter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublisherFilter]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublisherFilter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
