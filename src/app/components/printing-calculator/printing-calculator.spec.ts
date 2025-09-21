import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintingCalculator } from './printing-calculator';

describe('PrintingCalculator', () => {
  let component: PrintingCalculator;
  let fixture: ComponentFixture<PrintingCalculator>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrintingCalculator]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PrintingCalculator);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
