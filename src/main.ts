import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';


import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { environment } from './environments/environment';
import { provideDatabase, getDatabase } from '@angular/fire/database';
import { MONACO_PATH, MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { BrowserModule, bootstrapApplication } from '@angular/platform-browser';
import { AppRoutingModule } from './app/app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideAnimations } from '@angular/platform-browser/animations';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AppComponent } from './app/app.component';
import { importProvidersFrom } from '@angular/core';


bootstrapApplication(AppComponent, {
    providers: [
        importProvidersFrom(BrowserModule, AppRoutingModule, FormsModule, ReactiveFormsModule, MonacoEditorModule, MatInputModule, MatToolbarModule, MatIconModule, MatButtonModule, MatSelectModule, MatFormFieldModule),
        provideFirebaseApp(() => initializeApp(environment.firebase)),
        provideDatabase(() => getDatabase()),
        {
            provide: MONACO_PATH,
            useValue: 'https://unpkg.com/monaco-editor@0.52.0/min/vs'
        },
        provideAnimations()
    ]
})
  .catch(err => console.error(err));
