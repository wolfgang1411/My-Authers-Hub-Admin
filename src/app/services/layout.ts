import { Injectable, signal } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LayoutService {
  private isSidemenuOpen = signal(false);
  isSidemenuOpen$ = this.isSidemenuOpen.asReadonly();

  showHeader = signal(false);
  showHeader$ = this.showHeader.asReadonly();

  showSidebar = signal(false);
  showSidebar$ = this.showSidebar.asReadonly();

  toggleSidemenu() {
    this.isSidemenuOpen.set(!this.isSidemenuOpen());
  }

  changeHeaderVisibility(show = false) {
    this.showHeader.set(show);
  }

  changeSidebarVisibility(show = false) {
    this.showSidebar.set(show);
  }
}
