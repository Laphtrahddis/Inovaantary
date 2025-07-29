// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { LandingPageComponent } from './components/landing-page/landing-page';
import { ItemDashboardComponent } from './components/item-dashboard/item-dashboard';
import { ItemFormComponent } from './components/item-form/item-form';
import { ItemDetailsComponent } from './components/item-details/item-details';

export const routes: Routes = [
  { path: '', component: LandingPageComponent },
  { path: 'dashboard', component: ItemDashboardComponent },
  { path: 'add-item', component: ItemFormComponent },
  { path: 'edit-item/:id', component: ItemFormComponent },
  { path: 'item/:id', component: ItemDetailsComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' }
];