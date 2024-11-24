import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { Themes } from 'src/app/enums/themes';
import { GeneratorService } from 'src/app/services/generator.service';
import { Colors } from 'src/app/enums/colors';

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
    MatButton,
    MatSelectTrigger
  ]
})
export class SettingsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private generatorService = inject(GeneratorService);

  themeEntries = Object.entries(Themes);
  colorEntries = Object.entries(Colors);

  private defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private defaultColor = this.colorEntries.find(f => f[1] == Colors.red)?.[0] ?? '';
  private key?: string;

  formGroup = new FormBuilder().group({
    userName: [localStorage.getItem('userName') ?? '', Validators.required],
    theme: [localStorage.getItem('theme') ?? this.defaultTheme, Validators.required],
    color: [localStorage.getItem('color') ?? this.defaultColor, Validators.required]
  });

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.key = params.get('key') ?? undefined;
    });
  }

  async saveClick() {
    try {
      if (this.formGroup.valid) {
        if (!localStorage.getItem('userCode')) {
          const userCode = this.generatorService.generateKey();
          localStorage.setItem('userCode', userCode);
        }

        localStorage.setItem('userName', this.formGroup.controls.userName.value ?? '');
        localStorage.setItem('theme', this.formGroup.get('theme')?.value ?? this.defaultTheme);
        localStorage.setItem('color', this.formGroup.get('color')?.value ?? this.defaultColor);

        await this.router.navigate(this.key ? ['/editor', this.key] : ['/editor']);
      }
    } catch (error) {
      console.error(error);
    }
  }

  async cancelClick() {
    try {
      await this.router.navigate(this.key ? ['/editor', this.key] : ['/editor']);
    } catch (error) {
      console.error(error);
    }
  }

  getColorName(colorCode: string | null): string {
    const entry = this.colorEntries.find(entry => entry[0] === colorCode);
    return entry ? entry[1] : '';
  }
}
