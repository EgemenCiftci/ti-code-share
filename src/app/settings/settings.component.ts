import { Component } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Themes } from '../enums/themes';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent {
  themeEntries = Object.entries(Themes);
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';

  formGroup = new FormGroup({
    userName: new FormControl(localStorage.getItem('userName') ?? ''),
    theme: new FormControl(localStorage.getItem('theme') ?? this._defaultTheme),
  });

  saveClick() {
    localStorage.setItem('userName', this.formGroup.get('userName')?.value ?? '');
    localStorage.setItem('theme', this.formGroup.get('theme')?.value ?? this._defaultTheme);
  }
}
