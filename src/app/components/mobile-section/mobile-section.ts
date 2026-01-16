import { Component, Input, signal } from '@angular/core';

@Component({
  selector: 'app-mobile-section',
  imports: [],
  templateUrl: './mobile-section.html',
  styleUrl: './mobile-section.css',
})
export class MobileSection {
  @Input({ required: true }) title!: string;

  isOpen = signal(false);

  toggle() {
    this.isOpen.update((v) => !v);
  }
}
