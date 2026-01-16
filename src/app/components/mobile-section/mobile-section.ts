import { Component, Input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-mobile-section',
  imports: [MatIconModule, MatButtonModule],
  templateUrl: './mobile-section.html',
  styleUrl: './mobile-section.css',
})
export class MobileSection {
  @Input() title!: string;

  @Input() defaultOpen = false;

  isOpen = signal(false);

  ngOnInit() {
    this.isOpen.set(this.defaultOpen);
  }

  toggle() {
    this.isOpen.update((v) => !v);
  }
}
