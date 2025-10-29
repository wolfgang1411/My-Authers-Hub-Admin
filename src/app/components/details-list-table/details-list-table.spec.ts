import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsListTable } from './details-list-table';

describe('DetailsListTable', () => {
  let component: DetailsListTable;
  let fixture: ComponentFixture<DetailsListTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DetailsListTable]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DetailsListTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
