import { inject, NgModule } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';

const canActivateEditor: CanActivateFn = async (route: ActivatedRouteSnapshot, _state: RouterStateSnapshot) => {
  let key = route.params['key'];
  let isKeyCreated = false;

  if (!key) {
    key = Date.now();
    isKeyCreated = true;
  }

  localStorage.setItem('key', key);

  if (!localStorage.getItem('userCode')) {
    await inject(Router).navigate(['/settings', key]);
    return false;
  }

  if (!localStorage.getItem('userName')) {
    await inject(Router).navigate(['/settings', key]);
    return false;
  }

  if (isKeyCreated) {
    await inject(Router).navigate(['/editor', key]);
    return false;
  }

  return true;
};

const routes: Routes = [
  { path: '', loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent), canActivate: [canActivateEditor] },
  { path: 'editor', loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent), canActivate: [canActivateEditor] },
  { path: 'editor/:key', loadComponent: () => import('./components/editor/editor.component').then(m => m.EditorComponent), canActivate: [canActivateEditor] },
  { path: 'settings/:key', loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent) },
  { path: 'about', loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent) },
  { path: '**', loadComponent: () => import('./components/page-not-found/page-not-found.component').then(m => m.PageNotFoundComponent) }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
