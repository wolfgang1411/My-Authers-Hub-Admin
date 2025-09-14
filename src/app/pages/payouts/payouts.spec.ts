import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Payouts } from './payouts';

describe('Payouts', () => {
  let component: Payouts;
  let fixture: ComponentFixture<Payouts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Payouts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Payouts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
