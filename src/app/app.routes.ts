import { Routes } from '@angular/router';
import { privateRouteGuard } from './guards/private-route-guard';
import { publicRouteGuard } from './guards/public-route-guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./pages/dashboard/dashboard').then((c) => c.Dashboard),
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((c) => c.Login),
    canActivate: [publicRouteGuard],
  },
  {
    path: 'publisher',
    loadComponent: () =>
      import('./pages/publisher/publisher').then((c) => c.Publisher),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'author',
    loadComponent: () =>
      import('./pages/authors/authors').then((c) => c.Authors),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'author/:id',
    loadComponent: () =>
      import('./pages/add-author/add-author').then((c) => c.AddAuthor),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'author/invite/:signupCode',
    loadComponent: () =>
      import('./pages/add-author/add-author').then((c) => c.AddAuthor),
  },
  {
    path: 'title/:id',
    loadComponent: () =>
      import('./pages/add-title/add-title').then((c) => c.AddTitle),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'titles',
    loadComponent: () => import('./pages/titles/titles').then((c) => c.Titles),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'publisherDetails/:id',
    loadComponent: () =>
      import('./pages/publisher-details/publisher-details').then(
        (c) => c.PublisherDetails
      ),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'publisher/:id',
    loadComponent: () =>
      import('./pages/add-publisher/add-publisher').then((C) => C.AddPublisher),
    canActivate: [privateRouteGuard],
  },
  {
    path: 'publisher/invite/:signupCode',
    loadComponent: () =>
      import('./pages/add-publisher/add-publisher').then((C) => C.AddPublisher),
  },
  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
