import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AuthorTitleList } from './author-title-list';

describe('AuthorTitleList', () => {
  let component: AuthorTitleList;
  let fixture: ComponentFixture<AuthorTitleList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuthorTitleList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AuthorTitleList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
