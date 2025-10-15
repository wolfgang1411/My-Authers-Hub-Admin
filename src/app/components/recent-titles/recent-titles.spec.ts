import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecentTitles } from './recent-titles';

describe('RecentTitles', () => {
  let component: RecentTitles;
  let fixture: ComponentFixture<RecentTitles>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecentTitles]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecentTitles);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
