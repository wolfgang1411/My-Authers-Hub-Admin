import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleDetails } from './title-details';

describe('TitleDetails', () => {
  let component: TitleDetails;
  let fixture: ComponentFixture<TitleDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitleDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
