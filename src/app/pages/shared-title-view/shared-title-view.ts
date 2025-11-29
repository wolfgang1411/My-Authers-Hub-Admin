import { Component, OnInit, signal, computed } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  SharedTitlesService,
  SharedTitleMediaResponse,
} from '../shared-titles/shared-titles-service';
import { SharedModule } from '../../modules/shared/shared-module';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { SafeUrlPipe } from '../../pipes/safe-url-pipe';
import { CommonModule } from '@angular/common';
import { Back } from '../../components/back/back';
import { UserService } from '../../services/user';
import { User } from '../../interfaces';
import { Signal } from '@angular/core';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-shared-title-view',
  imports: [
    Back,
    SharedModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    CommonModule,
    SafeUrlPipe,
  ],
  templateUrl: './shared-title-view.html',
  styleUrl: './shared-title-view.css',
})
export class SharedTitleView implements OnInit {
  code!: string;
  titleData = signal<SharedTitleMediaResponse | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  loggedInUser!: Signal<User | null>;
  isLoggedIn = computed(() => !!this.loggedInUser());

  constructor(
    private route: ActivatedRoute,
    private sharedTitlesService: SharedTitlesService,
    private userService: UserService,
    private authService: AuthService
  ) {
    this.loggedInUser = this.userService.loggedInUser$;
  }

  ngOnInit() {
    this.route.params.subscribe(({ code }) => {
      this.code = code;
      this.fetchMediaByCode();
    });
  }

  async fetchMediaByCode() {
    try {
      this.isLoading.set(true);
      this.error.set(null);
      const data = await this.sharedTitlesService.getMediaByCode(this.code);
      this.titleData.set(data);
    } catch (error: any) {
      console.error('Error fetching shared title media:', error);
      this.error.set(
        error?.error?.message || 'Failed to load shared title media'
      );
    } finally {
      this.isLoading.set(false);
    }
  }

  frontCoverUrl(): string | null {
    const media = this.titleData()?.media || [];
    const front = media.find((m) => m.type === 'FRONT_COVER');
    return front ? front.url : null;
  }
}
