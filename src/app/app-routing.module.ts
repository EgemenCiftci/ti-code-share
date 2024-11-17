import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  { path: '', loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent) },
  { path: 'editor', loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent) },
  { path: 'editor/:key', loadComponent: () => import('./editor/editor.component').then(m => m.EditorComponent) },
  { path: 'settings', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'settings/:key', loadComponent: () => import('./settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'about', loadComponent: () => import('./about/about.component').then(m => m.AboutComponent) },
  { path: '**', loadComponent: () => import('./page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
