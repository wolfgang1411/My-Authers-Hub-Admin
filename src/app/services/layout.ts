import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Subject } from 'rxjs';

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
  private pageTitleSubject = new BehaviorSubject<string>('Dashboard');
  pageTitle$ = this.pageTitleSubject.asObservable();
  private pageIconSubject = new BehaviorSubject<string>('dashboard');
  pageIcone$ = this.pageIconSubject.asObservable();

  setPageTitle(title: string, icon: string) {
    this.pageTitleSubject.next(title);
    this.pageIconSubject.next(icon);
  }
}
