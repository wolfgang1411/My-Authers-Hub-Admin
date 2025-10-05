import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleDistribution } from './title-distribution';

describe('TitleDistribution', () => {
  let component: TitleDistribution;
  let fixture: ComponentFixture<TitleDistribution>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleDistribution]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitleDistribution);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
