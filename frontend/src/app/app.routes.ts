// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { ItemDashboardComponent } from './components/item-dashboard/item-dashboard';
import { ItemFormComponent } from './components/item-form/item-form';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'dashboard', component: ItemDashboardComponent },
  { path: 'add-item', component: ItemFormComponent },
  { path: 'edit-item/:id', component: ItemFormComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];