import { TestBed } from '@angular/core/testing';
import { Orders } from './orders';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { TranslateModule } from '@ngx-translate/core';

describe('Orders Component', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Orders, HttpClientTestingModule, TranslateModule.forRoot()],
    }).compileComponents();
  });

  it('should create', () => {
    const fixture = TestBed.createComponent(Orders);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });
});

