import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EarningTable } from './earning-table';

describe('EarningTable', () => {
  let component: EarningTable;
  let fixture: ComponentFixture<EarningTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EarningTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EarningTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
