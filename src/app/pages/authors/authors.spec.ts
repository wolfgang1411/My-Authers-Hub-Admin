import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Authors } from './authors';

describe('Authors', () => {
  let component: Authors;
  let fixture: ComponentFixture<Authors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Authors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Authors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
