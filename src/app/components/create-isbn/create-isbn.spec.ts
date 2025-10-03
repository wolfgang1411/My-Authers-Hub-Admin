import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateIsbn } from './create-isbn';

describe('CreateIsbn', () => {
  let component: CreateIsbn;
  let fixture: ComponentFixture<CreateIsbn>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateIsbn]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CreateIsbn);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
