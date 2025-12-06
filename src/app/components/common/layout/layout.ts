import { Component, Signal } from '@angular/core';
import { Header } from '../header/header';
import { Sidebar } from '../sidebar/sidebar';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../../services/layout';
import { Footer } from '../footer/footer';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, Sidebar, Header, Footer],
  templateUrl: './layout.html',
  styleUrl: './layout.css',
})
export class Layout {
  constructor(layoutService: LayoutService) {
    this.showHeader = layoutService.showHeader$;
    this.showSidebar = layoutService.showSidebar$;
  }

  showHeader!: Signal<boolean>;
  showSidebar!: Signal<boolean>;
}
