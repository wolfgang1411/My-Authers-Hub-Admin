import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DistributionDialog } from './distribution-dialog';

describe('DistributionDialog', () => {
  let component: DistributionDialog;
  let fixture: ComponentFixture<DistributionDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DistributionDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DistributionDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
