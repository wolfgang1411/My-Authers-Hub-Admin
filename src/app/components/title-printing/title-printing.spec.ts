import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitlePrinting } from './title-printing';

describe('TitlePrinting', () => {
  let component: TitlePrinting;
  let fixture: ComponentFixture<TitlePrinting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitlePrinting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitlePrinting);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
