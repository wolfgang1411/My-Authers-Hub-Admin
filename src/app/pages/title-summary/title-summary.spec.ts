import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleSummary } from './title-summary';

describe('TitleSummary', () => {
  let component: TitleSummary;
  let fixture: ComponentFixture<TitleSummary>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleSummary]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitleSummary);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
