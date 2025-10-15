import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RoyaltyTable } from './royalty-table';

describe('RoyaltyTable', () => {
  let component: RoyaltyTable;
  let fixture: ComponentFixture<RoyaltyTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoyaltyTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RoyaltyTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
