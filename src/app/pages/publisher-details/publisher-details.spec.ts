import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublisherDetails } from './publisher-details';

describe('PublisherDetails', () => {
  let component: PublisherDetails;
  let fixture: ComponentFixture<PublisherDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublisherDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublisherDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
