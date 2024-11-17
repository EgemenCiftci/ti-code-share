import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor, MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { Database, ref, set, onValue, DatabaseReference, update, child, get } from '@angular/fire/database';
import { ActivatedRoute, Router } from '@angular/router';
import { Languages } from '../enums/languages';
import { Themes } from '../enums/themes';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { NgFor } from '@angular/common';
import { MatOption } from '@angular/material/core';

@Component({
    selector: 'app-editor',
    templateUrl: './editor.component.html',
    styleUrls: ['./editor.component.css'],
    standalone: true,
    imports: [FormsModule, ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatSelect, NgFor, MatOption, MonacoEditorModule]
})
export class EditorComponent implements OnInit, OnDestroy {
  languageEntries = Object.entries(Languages);
  themeEntries = Object.entries(Themes);

  private _subscriptions: Subscription[] = [];
  private _defaultLanguage = this.languageEntries.find(f => f[1] == Languages.csharp)?.[0] ?? '';
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private _defaultCode = '';
  private _defaultPosition = { lineNumber: 1, column: 1 };
  private _defaultUserInfos = [{ name: '', position: this._defaultPosition }];

  formGroup: FormGroup = new FormGroup({
    userName: new FormControl({ value: localStorage.getItem('userName') ?? '', disabled: true }),
    key: new FormControl({ value: '', disabled: true }),
    language: new FormControl(this._defaultLanguage),
    theme: new FormControl(localStorage.getItem('theme') ?? this._defaultTheme),
    code: new FormControl(undefined)
  });

  editorOptions: MonacoEditorConstructionOptions = {
    language: this._defaultLanguage,
    automaticLayout: true,
    theme: this.formGroup.get('theme')?.value?.replace('_', '-') ?? this._defaultTheme,
  };

  private _database: Database = inject(Database);
  private _languageRef?: DatabaseReference;
  private _codeRef?: DatabaseReference;
  private _userInfosRef?: DatabaseReference;

  private _userInfos = this._defaultUserInfos;

  get userInfos() {
    return this._userInfos;
  }

  set userInfos(value: { name: string, position: { lineNumber: number, column: number } }[]) {
    if (value !== this._userInfos) {
      this._userInfos = value;
      if (this._userInfosRef) {
        set(this._userInfosRef, value);
      }
    }
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router) {
  }

  ngOnInit() {
    const languageControl = this.formGroup.get('language');

    const s0 = languageControl?.valueChanges.subscribe(async newValue => {
      this.editorOptions = { ...this.editorOptions, language: newValue ?? this._defaultLanguage };
      if (this._languageRef) {
        await set(this._languageRef, newValue);
      }
    });

    if (s0) {
      this._subscriptions.push(s0);
    }

    const s1 = this.formGroup.get('theme')?.valueChanges.subscribe(newValue => {
      this.editorOptions = { ...this.editorOptions, theme: newValue?.replace('_', '-') ?? this._defaultTheme };
    });

    if (s1) {
      this._subscriptions.push(s1);
    }

    const codeControl = this.formGroup.get('code');

    const s2 = codeControl?.valueChanges.subscribe(async newValue => {
      if (this._codeRef && newValue !== undefined) {
        await set(this._codeRef, newValue);
      }
    });

    if (s2) {
      this._subscriptions.push(s2);
    }

    const s3 = this.route.paramMap.subscribe(async params => {
      const key = params.get('key');

      if (!localStorage.getItem('userName')) {
        this.router.navigate(key ? ['/settings', key] : ['/settings']);
        return;
      }

      if (!key) {
        this.router.navigate(['/editor', this.generateKey()]);
        return;
      }

      this.formGroup.get('key')?.patchValue(key);

      this._languageRef = ref(this._database, `${key}/language`);
      this._codeRef = ref(this._database, `${key}/code`);
      this._userInfosRef = ref(this._database, `${key}/userInfos`);

      codeControl?.patchValue(await this.getCode());

      onValue(this._languageRef, f => {
        if (languageControl && f.val() !== languageControl.value) {
          languageControl.patchValue(f.val() ?? this._defaultLanguage);
        }
      });

      onValue(this._codeRef, f => {
        if (codeControl && f.val() !== codeControl.value) {
          codeControl.patchValue(f.val() ?? this._defaultCode);
        }
      });

      onValue(this._userInfosRef, f => this.userInfos = f.val() ?? this._defaultUserInfos);
    });

    if (s3) {
      this._subscriptions.push(s3);
    }
  }

  ngOnDestroy() {
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  editorInit(editor: MonacoStandaloneCodeEditor) {
    editor.onDidChangeCursorPosition(e => {
      const userInfo = this.getUserInfo(localStorage.getItem('userName') ?? '');
      if (userInfo) {
        userInfo.position = e.position;
      }
    });
  }

  private generateKey(): string {
    return Math.random().toString(36).substring(2);
  }

  private getUserInfo(userName: string): { name: string, position: { lineNumber: number, column: number } } | undefined {
    return this.userInfos.find(f => f.name === userName);
  }

  private async getCode(): Promise<string> {
    return (await get(this._codeRef!)).val() ?? this._defaultCode;
  }
}