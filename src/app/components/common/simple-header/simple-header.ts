import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-simple-header',
  imports: [RouterModule, MatIconModule],
  templateUrl: './simple-header.html',
  styleUrl: './simple-header.css',
})
export class SimpleHeader {
  mobileMenuOpen = signal(false);

  toggleMobileMenu() {
    this.mobileMenuOpen.update((v) => !v);
  }

  closeMobileMenu() {
    this.mobileMenuOpen.set(false);
  }
}

