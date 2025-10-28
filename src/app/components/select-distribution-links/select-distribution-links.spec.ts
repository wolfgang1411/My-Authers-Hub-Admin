import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SelectDistributionLinks } from './select-distribution-links';

describe('SelectDistributionLinks', () => {
  let component: SelectDistributionLinks;
  let fixture: ComponentFixture<SelectDistributionLinks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SelectDistributionLinks]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SelectDistributionLinks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
