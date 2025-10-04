import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ISBNList } from './isbn-list';

describe('ISBNList', () => {
  let component: ISBNList;
  let fixture: ComponentFixture<ISBNList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ISBNList]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ISBNList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
