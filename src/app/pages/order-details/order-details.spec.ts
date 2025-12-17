import { TestBed } from '@angular/core/testing';
import { OrderDetails } from './order-details';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('OrderDetails Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        OrderDetails,
        HttpClientTestingModule,
        TranslateModule.forRoot(),
      ],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(OrderDetails);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});

