import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateTitleConfigList } from './update-title-config-list';

describe('UpdateTitleConfigList', () => {
  let component: UpdateTitleConfigList;
  let fixture: ComponentFixture<UpdateTitleConfigList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateTitleConfigList],
    }).compileComponents();

    fixture = TestBed.createComponent(UpdateTitleConfigList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
