import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthorDetails } from './author-details';

describe('AuthorDetails', () => {
  let component: AuthorDetails;
  let fixture: ComponentFixture<AuthorDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorDetails]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorDetails);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
