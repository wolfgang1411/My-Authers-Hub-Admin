import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateLaminationType } from './add-update-lamination-type';

describe('AddUpdateLaminationType', () => {
  let component: AddUpdateLaminationType;
  let fixture: ComponentFixture<AddUpdateLaminationType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdateLaminationType]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpdateLaminationType);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
