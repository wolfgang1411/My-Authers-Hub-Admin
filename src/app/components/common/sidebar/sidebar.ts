import { Component, OnInit, Signal, signal } from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { RouterModule } from '@angular/router';
import { LayoutService } from '../../../services/layout';
import { SideMenu } from '../../../interfaces';

@Component({
  selector: 'app-sidebar',
  imports: [SharedModule, RouterModule],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
})
export class Sidebar implements OnInit {
  constructor(private layoutService: LayoutService) {
    this.isSidemenuOpen = layoutService.isSidemenuOpen$;
  }

  sidebarMenu = signal<SideMenu[]>([]);
  isSidemenuOpen!: Signal<boolean>;

  ngOnInit(): void {
    this.sidebarMenu.set([
      {
        name: 'dashboard',
        url: '/dashboard',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'publishers',
        url: '/publisher',
        icon: 'images/house-solid-full.svg',
      },
      {
        name: 'authors',
        url: '/author',
        icon: 'images/house-solid-full.svg',
      },
    ]);
  }

  onToggleSidebar() {
    this.layoutService.toggleSidemenu();
  }
}
