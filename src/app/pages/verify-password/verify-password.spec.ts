import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VerifyPassword } from './verify-password';

describe('VerifyPassword', () => {
  let component: VerifyPassword;
  let fixture: ComponentFixture<VerifyPassword>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VerifyPassword]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VerifyPassword);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
