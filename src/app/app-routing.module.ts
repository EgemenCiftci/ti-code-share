import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent) },
  { path: 'editor', loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent) },
  { path: 'editor/:key', loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent) },
  { path: 'settings', loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'settings/:key', loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'about', loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent) },
  { path: '**', loadComponent: () => import('./components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
