import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup } from '@angular/forms';
import { Themes } from '../enums/themes';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css']
})
export class SettingsComponent implements OnInit {
  themeEntries = Object.entries(Themes);
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private _key?: string;

  formGroup = new FormGroup({
    userName: new FormControl(localStorage.getItem('userName') ?? ''),
    theme: new FormControl(localStorage.getItem('theme') ?? this._defaultTheme),
  });

  constructor(
    private route: ActivatedRoute,
    private router: Router) {
  }

  saveClick() {
    localStorage.setItem('userName', this.formGroup.get('userName')?.value ?? '');
    localStorage.setItem('theme', this.formGroup.get('theme')?.value ?? this._defaultTheme);
    
    if (this._key) {
      this.router.navigate(['editor', this._key]);
    }
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this._key = params.get('key') ?? undefined;
    });
  }
}
