import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignIsbn } from './assign-isbn';

describe('AssignIsbn', () => {
  let component: AssignIsbn;
  let fixture: ComponentFixture<AssignIsbn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignIsbn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AssignIsbn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
