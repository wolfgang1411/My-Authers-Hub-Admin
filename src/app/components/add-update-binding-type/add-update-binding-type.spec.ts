import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateBindingType } from './add-update-binding-type';

describe('AddUpdateBindingType', () => {
  let component: AddUpdateBindingType;
  let fixture: ComponentFixture<AddUpdateBindingType>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdateBindingType]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpdateBindingType);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
