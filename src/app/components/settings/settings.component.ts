import { Component, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { Themes } from 'src/app/enums/themes';
import { GeneratorService } from 'src/app/services/generator.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MatButton
  ]
})
export class SettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private generatorService = inject(GeneratorService);

  themeEntries = Object.entries(Themes);
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private _key?: string;

  formGroup = new FormGroup({
    userName: new FormControl(localStorage.getItem('userName') ?? ''),
    theme: new FormControl(localStorage.getItem('theme') ?? this._defaultTheme),
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this._key = params.get('key') ?? undefined;
    });
  }

  saveClick() {
    if (!localStorage.getItem('userCode')) {
      const userCode = this.generatorService.generateKey();
      localStorage.setItem('userCode', userCode);
    }

    localStorage.setItem('userName', this.formGroup.get('userName')?.value ?? '');
    localStorage.setItem('theme', this.formGroup.get('theme')?.value ?? this._defaultTheme);

    this.router.navigate(this._key ? ['/editor', this._key] : ['/editor']);
  }
}
