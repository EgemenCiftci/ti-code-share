import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor, MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { Database, ref, set, onValue, DatabaseReference, get } from '@angular/fire/database';
import { ActivatedRoute, Router } from '@angular/router';
import { Languages } from '../../enums/languages';
import { Themes } from '../../enums/themes';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { Position } from 'src/app/models/position';
import { User } from 'src/app/models/user';
import { Selection } from 'src/app/models/selection';
import { GeneratorService } from 'src/app/services/generator.service';

@Component({
  selector: 'app-editor',
  templateUrl: './editor.component.html',
  styleUrls: ['./editor.component.css'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatSelect,
    MatOption,
    MonacoEditorModule
  ]
})
export class EditorComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private generatorService = inject(GeneratorService);

  languageEntries = Object.entries(Languages);
  themeEntries = Object.entries(Themes);

  private _subscriptions: Subscription[] = [];
  private _defaultLanguage = this.languageEntries.find(f => f[1] == Languages.csharp)?.[0] ?? '';
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private _defaultCode = '';
  private _defaultPosition: Position = { lineNumber: 1, column: 1 };
  private _defaultSelection: Selection = { begin: { lineNumber: 0, column: 0 }, end: { lineNumber: 0, column: 0 } };
  private _defaultUsers: User[] = [{ code: '', name: '', position: this._defaultPosition, selection: this._defaultSelection }];

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
    theme: this.formGroup.get('theme')?.value?.replace('_', '-') ?? this._defaultTheme
  };

  private _database: Database = inject(Database);
  private _languageRef?: DatabaseReference;
  private _codeRef?: DatabaseReference;
  private _usersRef?: DatabaseReference;

  private _users = this._defaultUsers;
  private editor?: MonacoStandaloneCodeEditor;
  private key?: string;
  private currentUser?: User;

  get users(): User[] {
    return this._users;
  }

  set users(value: User[]) {
    if (value !== this._users) {
      this._users = value;
      if (this._usersRef) {
        set(this._usersRef, value);
      }
    }
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

      const currentUserCode = localStorage.getItem('userCode');
      const currentUserName = localStorage.getItem('userName');

      if (!currentUserCode || !currentUserName) {
        this.router.navigate(key ? ['/settings', key] : ['/settings']);
        return;
      }

      this.currentUser = { code: currentUserCode, name: currentUserName, position: this._defaultPosition, selection: this._defaultSelection };

      if (!key) {
        this.key = this.generatorService.generateKey();
        this.router.navigate(['/editor', this.key]);
        return;
      }

      this.key = key;
      this.formGroup.get('key')?.patchValue(key);

      this._languageRef = ref(this._database, `${key}/language`);
      this._codeRef = ref(this._database, `${key}/code`);
      this._usersRef = ref(this._database, `${key}/users`);

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

      onValue(this._usersRef, f => {
        this.users = f.val() ?? this._defaultUsers;
        this.updateUserOverlays();
      });
    });

    if (s3) {
      this._subscriptions.push(s3);
    }
  }

  ngOnDestroy() {
    this._subscriptions.forEach(s => s.unsubscribe());
  }

  editorInit(editor: MonacoStandaloneCodeEditor) {
    this.editor = editor;

    editor.onDidChangeCursorPosition(e => {
      if (this.currentUser) {
        this.currentUser.position.column = e.position.column;
        this.currentUser.position.lineNumber = e.position.lineNumber;
        set(ref(this._database, `${this.key}/users/${this.currentUser.code}/position`), this.currentUser.position);
      }
    });

    editor.onDidChangeCursorSelection(e => {
      if (this.currentUser) {
        this.currentUser.selection.begin.column = e.selection.startColumn;
        this.currentUser.selection.begin.lineNumber = e.selection.startLineNumber;
        this.currentUser.selection.end.column = e.selection.positionColumn;
        this.currentUser.selection.end.lineNumber = e.selection.positionLineNumber;
        set(ref(this._database, `${this.key}/users/${this.currentUser.code}/selection`), this.currentUser.selection);
      }
    });
  }

  private getUserInfo(userCode: string): User | undefined {
    return this.users.find(f => f.code === userCode);
  }

  private async getCode(): Promise<string> {
    return (await get(this._codeRef!)).val() ?? this._defaultCode;
  }

  private updateUserOverlays() {
    // Clear previous decorations
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    // Add overlays for each user
    Object.entries(this.users).forEach(([userCode, data]) => {
      if (userCode === this.currentUser?.code)
        return; // Skip current user

      const position = data.position;

      // Add cursor decoration
      if (position) {
        decorations.push({
          range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column),
          options: {
            className: 'remote-cursor',
          },
        });
      }

      const selection = data.selection;

      // Add highlight decoration
      if (selection) {
        decorations.push({
          range: new monaco.Range(
            selection.begin.lineNumber,
            selection.begin.column,
            selection.end.lineNumber,
            selection.end.column
          ),
          options: {
            className: 'remote-highlight',
          },
        });
      }
    });

    // Apply decorations
    this.editor?.deltaDecorations([], decorations);
  }
}