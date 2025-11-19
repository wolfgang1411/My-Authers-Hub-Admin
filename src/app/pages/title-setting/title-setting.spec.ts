import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TitleSetting } from './title-setting';

describe('TitleSetting', () => {
  let component: TitleSetting;
  let fixture: ComponentFixture<TitleSetting>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TitleSetting]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TitleSetting);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
