import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExportEarningsDialog } from './export-earnings-dialog';

describe('ExportEarningsDialog', () => {
  let component: ExportEarningsDialog;
  let fixture: ComponentFixture<ExportEarningsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExportEarningsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExportEarningsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
