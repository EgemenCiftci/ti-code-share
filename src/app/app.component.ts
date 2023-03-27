import { Component, inject, OnInit } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoEditorLoaderService } from '@materia-ui/ngx-monaco-editor';
import { filter, take } from 'rxjs';
import { Database, ref, set, onValue, DatabaseReference } from '@angular/fire/database';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'TI Code Share';
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
  private defaultLanguage = this.languages[0].key;
  private defaultTheme = this.themes[0].key;
  editorOptions: MonacoEditorConstructionOptions = {
    language: this.language,
    theme: this.theme,
    automaticLayout: true,
  };
  key?: string;
  private _database: Database = inject(Database);
  languageRef?: DatabaseReference;
  codeRef?: DatabaseReference;

  private _theme = this.defaultTheme;
  get theme() {
    return this._theme;
  }
  set theme(value: string) {
    if (value !== this._theme) {
      this._theme = value;
      this.editorOptions = { ...this.editorOptions, theme: value };
    }
  }

  private _language = this.defaultLanguage;
  get language() {
    return this._language;
  }
  set language(value: string) {
    if (value !== this._language) {
      this._language = value;
      this.editorOptions = { ...this.editorOptions, language: value };
      if (this.languageRef) {
        set(this.languageRef, value);
      }
    }
  }

  private _code = '';
  get code() {
    return this._code;
  }
  set code(value: string) {
    if (value !== this._code) {
      this._code = value;
      if (this.codeRef) {
        set(this.codeRef, value);
      }
    }
  }

  constructor(private monacoLoaderService: MonacoEditorLoaderService, private route: ActivatedRoute) {
    this.monacoLoaderService.isMonacoLoaded$
      .pipe(
        filter((isLoaded) => isLoaded),
        take(1)
      )
      .subscribe();
  }

  ngOnInit() {
    this.route.queryParamMap.subscribe(params => {
      const key = params.get('key');
      if (key) {
        this.key = key;
      } else {
        this.key = this.generateKey();
      }
      this.languageRef = ref(this._database, `${this.key}/language`);
      this.codeRef = ref(this._database, `${this.key}/code`);
      onValue(this.languageRef, f => this.language = f.val() ?? this.defaultLanguage);
      onValue(this.codeRef, f => this.code = f.val());
    });
  }

  private generateKey() {
    return Date.now().toString(36);
  }
}
