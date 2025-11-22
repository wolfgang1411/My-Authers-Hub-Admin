import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpdateTitleTicket } from './update-title-ticket';

describe('UpdateTitleTicket', () => {
  let component: UpdateTitleTicket;
  let fixture: ComponentFixture<UpdateTitleTicket>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpdateTitleTicket]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpdateTitleTicket);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
