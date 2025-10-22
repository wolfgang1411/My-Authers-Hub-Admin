import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddTitleConfig } from './add-title-config';

describe('AddTitleConfig', () => {
  let component: AddTitleConfig;
  let fixture: ComponentFixture<AddTitleConfig>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddTitleConfig]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddTitleConfig);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
