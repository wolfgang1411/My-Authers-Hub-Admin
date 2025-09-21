import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateSizeType } from './add-update-size-type';

describe('AddUpdateSizeType', () => {
  let component: AddUpdateSizeType;
  let fixture: ComponentFixture<AddUpdateSizeType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdateSizeType]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpdateSizeType);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
