import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApproveTitle } from './approve-title';

describe('ApproveTitle', () => {
  let component: ApproveTitle;
  let fixture: ComponentFixture<ApproveTitle>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ApproveTitle]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ApproveTitle);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
