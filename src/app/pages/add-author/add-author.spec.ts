import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddAuthor } from './add-author';

describe('AddAuthor', () => {
  let component: AddAuthor;
  let fixture: ComponentFixture<AddAuthor>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddAuthor]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddAuthor);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
