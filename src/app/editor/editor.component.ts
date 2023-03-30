import { Component, inject, Input, OnInit } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor } from '@materia-ui/ngx-monaco-editor';
import { Database, ref, set, onValue, DatabaseReference } from '@angular/fire/database';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css']
})
export class EditorComponent implements OnInit {
  @Input() name: string = '';

  languages = [
    { key: 'csharp', label: 'C#' },
    { key: 'html', label: 'HTML' },
    { key: 'java', label: 'Java' },
    { key: 'javascript', label: 'Javascript' },
    { key: 'markdown', label: 'Markdown' },
    { key: 'python', label: 'Python' },
    { key: 'ruby', label: 'Ruby' }
  ];

  themes = [
    { key: 'vs', label: 'Visual Studio' },
    { key: 'vs-dark', label: 'Visual Studio Dark' },
    { key: 'hc-black', label: 'High Contrast Black' }
  ];

  private _defaultLanguage = this.languages[0].key;
  private _defaultTheme = this.themes[0].key;
  private _defaultCode = '';
  private _defaultPosition = { lineNumber: 1, column: 1 };
  private _defaultUserInfos = [{ name: '', position: this._defaultPosition }];

  editorOptions: MonacoEditorConstructionOptions = {
    language: this.language,
    theme: this.theme,
    automaticLayout: true,
  };

  key?: string;
  private _database: Database = inject(Database);
  private _languageRef?: DatabaseReference;
  private _codeRef?: DatabaseReference;
  private _userInfosRef?: DatabaseReference;

  private _theme = this._defaultTheme;

  get theme(): string {
    return this._theme;
  }

  set theme(value: string) {
    if (value !== this._theme) {
      this._theme = value;
      this.editorOptions = { ...this.editorOptions, theme: value };
    }
  }

  private _language = this._defaultLanguage;

  get language(): string {
    return this._language;
  }

  set language(value: string) {
    if (value !== this._language) {
      this._language = value;
      this.editorOptions = { ...this.editorOptions, language: value };
      if (this._languageRef) {
        set(this._languageRef, value);
      }
    }
  }

  private _code = this._defaultCode;

  get code(): string {
    return this._code;
  }

  set code(value: string) {
    if (value !== this._code) {
      this._code = value;
      if (this._codeRef) {
        set(this._codeRef, value);
      }
    }
  }

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

  constructor(private route: ActivatedRoute) {
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const key = params.get('key');

      if (key) {
        this.key = key;
      } else {
        this.key = this.generateKey();
      }

      this._languageRef = ref(this._database, `${this.key}/language`);
      this._codeRef = ref(this._database, `${this.key}/code`);
      this._userInfosRef = ref(this._database, `${this.key}/userInfos`);

      onValue(this._languageRef, f => this.language = f.val() ?? this._defaultLanguage);
      onValue(this._codeRef, f => this.code = f.val() ?? this._defaultCode);
      onValue(this._userInfosRef, f => this.userInfos = f.val() ?? this._defaultUserInfos);
    });
  }

  editorInit(editor: MonacoStandaloneCodeEditor) {
    editor.onDidChangeCursorPosition(e => {
      const userInfo = this.getUserInfo(this.name);
      if (userInfo) {
        userInfo.position = e.position;
      }
    });
  }

  private generateKey(): string {
    return Math.random().toString(36).substring(2);
  }

  private getUserInfo(name: string): { name: string, position: { lineNumber: number, column: number } } | undefined {
    return this.userInfos.find(f => f.name === name);
  }
}

