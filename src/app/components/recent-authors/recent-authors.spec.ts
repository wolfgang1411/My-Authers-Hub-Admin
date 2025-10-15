import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentAuthors } from './recent-authors';

describe('RecentAuthors', () => {
  let component: RecentAuthors;
  let fixture: ComponentFixture<RecentAuthors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentAuthors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentAuthors);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
