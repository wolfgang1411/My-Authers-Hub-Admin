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
path :'publisher',
loadComponent:()=>import('./pages/publisher/publisher').then((c) => c.Publisher),
    canActivate: [privateRouteGuard],},
    {
path : 'author',
loadComponent:()=>import('./pages/authors/authors').then((c)=>c.Authors),
canActivate:[privateRouteGuard],
    },
    {
path :'publisher/:id',
loadComponent:()=>import('./pages/publisher-details/publisher-details').then((c) => c.PublisherDetails),
    canActivate: [privateRouteGuard],},

  {
    path: '',
    redirectTo: '/dashboard',
    pathMatch: 'full',
  },
];
