import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Royalties } from './royalties';

describe('Royalties', () => {
  let component: Royalties;
  let fixture: ComponentFixture<Royalties>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Royalties]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Royalties);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
