import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MobileSection } from './mobile-section';

describe('MobileSection', () => {
  let component: MobileSection;
  let fixture: ComponentFixture<MobileSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MobileSection]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MobileSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
