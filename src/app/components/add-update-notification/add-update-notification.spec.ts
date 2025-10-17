import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddUpdateNotification } from './add-update-notification';

describe('AddUpdateNotification', () => {
  let component: AddUpdateNotification;
  let fixture: ComponentFixture<AddUpdateNotification>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddUpdateNotification]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddUpdateNotification);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
