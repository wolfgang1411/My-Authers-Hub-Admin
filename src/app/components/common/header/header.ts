import { Component, computed, OnInit } from '@angular/core';
import { SharedModule } from '../../../modules/shared/shared-module';
import { LayoutService } from '../../../services/layout';
import { UserService } from '../../../services/user';

@Component({
  selector: 'app-header',
  imports: [SharedModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit {
  constructor(
    private layoutService: LayoutService,
    public userService: UserService
  ) {}

  ngOnInit(): void {}

  fullName = computed(() => {
    return (
      (this.userService.loggedInUser$()?.firstName || 'Guest') +
      ' ' +
      (this.userService.loggedInUser$()?.lastName || '')
    );
  });

  onSidebarToggle() {
    console.log(this.layoutService);

    this.layoutService.toggleSidemenu();
  }
}
