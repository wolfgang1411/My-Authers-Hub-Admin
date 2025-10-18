import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleConfigComponent } from './title-config';

describe('TitleConfig', () => {
  let component: TitleConfigComponent;
  let fixture: ComponentFixture<TitleConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleConfigComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TitleConfigComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
