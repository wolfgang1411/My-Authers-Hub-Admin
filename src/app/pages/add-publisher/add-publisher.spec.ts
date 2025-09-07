import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPublisher } from './add-publisher';

describe('AddPublisher', () => {
  let component: AddPublisher;
  let fixture: ComponentFixture<AddPublisher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPublisher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPublisher);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
