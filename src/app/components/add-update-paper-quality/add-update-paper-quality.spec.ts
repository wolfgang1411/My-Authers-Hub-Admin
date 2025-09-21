import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdatePaperQuality } from './add-update-paper-quality';

describe('AddUpdatePaperQuality', () => {
  let component: AddUpdatePaperQuality;
  let fixture: ComponentFixture<AddUpdatePaperQuality>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdatePaperQuality]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpdatePaperQuality);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
