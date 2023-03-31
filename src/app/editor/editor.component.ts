import { Component, inject, OnInit } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor } from '@materia-ui/ngx-monaco-editor';
import { Database, ref, set, onValue, DatabaseReference } from '@angular/fire/database';
import { ActivatedRoute, Router } from '@angular/router';
import { Languages } from '../enums/languages';
import { Themes } from '../enums/themes';
import { FormControl, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {
  languageEntries = Object.entries(Languages);
  themeEntries = Object.entries(Themes);

  private _defaultLanguage = this.languageEntries.find(f => f[1] == Languages.csharp)?.[0] ?? '';
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private _defaultCode = '';
  private _defaultPosition = { lineNumber: 1, column: 1 };
  private _defaultUserInfos = [{ name: '', position: this._defaultPosition }];

  formGroup = new FormGroup({
    userName: new FormControl({ value: localStorage.getItem('userName') ?? '', disabled: true }),
    key: new FormControl({ value: '', disabled: true }),
    language: new FormControl(this._defaultLanguage),
    theme: new FormControl(localStorage.getItem('theme') ?? this._defaultTheme),
    code: new FormControl(this._defaultCode),
  });

  editorOptions: MonacoEditorConstructionOptions = {
    language: this._defaultLanguage,
    theme: this.formGroup.get('theme')?.value?.replace('_', '-'),
    automaticLayout: true,
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
    this.formGroup.get('language')?.valueChanges.subscribe(newValue => {
      this.editorOptions = { ...this.editorOptions, language: newValue ?? this._defaultLanguage };
      if (this._languageRef) {
        set(this._languageRef, newValue);
      }
    });

    this.formGroup.get('theme')?.valueChanges.subscribe(newValue => {
      this.editorOptions = { ...this.editorOptions, theme: newValue?.replace('_', '-') ?? this._defaultTheme };
    });

    this.formGroup.get('code')?.valueChanges.subscribe(newValue => {
      if (this._codeRef) {
        set(this._codeRef, newValue);
      }
    });

    this.route.paramMap.subscribe(params => {
      const key = params.get('key');

      if (!localStorage.getItem('userName')) {
        this.router.navigate(key ? ['settings', key] : ['settings']);
        return;
      }

      if (!key) {
        this.router.navigate(['editor', this.generateKey()]);
        return;
      }

      this.formGroup.get('key')?.setValue(key);

      this._languageRef = ref(this._database, `${key}/language`);
      this._codeRef = ref(this._database, `${key}/code`);
      this._userInfosRef = ref(this._database, `${key}/userInfos`);

      onValue(this._languageRef, f => this.formGroup.get('language')?.setValue(f.val() ?? this._defaultLanguage));
      onValue(this._codeRef, f => this.formGroup.get('code')?.setValue(f.val() ?? this._defaultCode));
      onValue(this._userInfosRef, f => this.userInfos = f.val() ?? this._defaultUserInfos);
    });
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
}

