import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddSales } from './add-sales';

describe('AddSales', () => {
  let component: AddSales;
  let fixture: ComponentFixture<AddSales>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddSales]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddSales);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
