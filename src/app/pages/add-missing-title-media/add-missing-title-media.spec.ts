import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMissingTitleMedia } from './add-missing-title-media';

describe('AddMissingTitleMedia', () => {
  let component: AddMissingTitleMedia;
  let fixture: ComponentFixture<AddMissingTitleMedia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddMissingTitleMedia]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddMissingTitleMedia);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
