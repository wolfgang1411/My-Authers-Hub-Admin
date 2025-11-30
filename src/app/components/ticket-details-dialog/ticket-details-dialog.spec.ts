import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TicketDetailsDialog } from './ticket-details-dialog';

describe('TicketDetailsDialog', () => {
  let component: TicketDetailsDialog;
  let fixture: ComponentFixture<TicketDetailsDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TicketDetailsDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TicketDetailsDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
