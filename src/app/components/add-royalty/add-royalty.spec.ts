import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddRoyalty } from './add-royalty';

describe('AddRoyalty', () => {
  let component: AddRoyalty;
  let fixture: ComponentFixture<AddRoyalty>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddRoyalty]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddRoyalty);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
