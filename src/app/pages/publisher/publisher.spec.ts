import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Publisher } from './publisher';

describe('Publisher', () => {
  let component: Publisher;
  let fixture: ComponentFixture<Publisher>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Publisher]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Publisher);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
