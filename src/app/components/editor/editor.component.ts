import { Component, HostListener, inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor, MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { Database, ref, set, onValue, DatabaseReference, get, child, remove } from '@angular/fire/database';
import { ActivatedRoute, Router } from '@angular/router';
import { Languages } from '../../enums/languages';
import { Themes } from '../../enums/themes';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { Position } from 'src/app/models/position';
import { User } from 'src/app/models/user';
import { Selection } from 'src/app/models/selection';
import { GeneratorService } from 'src/app/services/generator.service';
import { Colors } from 'src/app/enums/colors';

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
    MatTooltip,
    MonacoEditorModule
  ]
})
export class EditorComponent implements OnInit, OnDestroy {

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private generatorService = inject(GeneratorService);
  private database = inject(Database);
  private renderer = inject(Renderer2);

  languageEntries = Object.entries(Languages);
  themeEntries = Object.entries(Themes);
  colors = Object.keys(Colors);

  private _subscriptions: Subscription[] = [];
  private _defaultLanguage = this.languageEntries.find(f => f[1] == Languages.csharp)?.[0] ?? '';
  private _defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private _defaultCode = '';
  private _defaultPosition: Position = { lineNumber: 1, column: 1 };
  private _defaultSelection: Selection = { begin: { lineNumber: 0, column: 0 }, end: { lineNumber: 0, column: 0 } };
  private _defaultUsers: User[] = [];
  private oldDecorations: string[] | undefined;

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

  private _languageRef?: DatabaseReference;
  private _codeRef?: DatabaseReference;
  private _usersRef!: DatabaseReference;
  users = this._defaultUsers;
  private editor?: MonacoStandaloneCodeEditor;
  private key?: string;
  private currentUser?: User;
  private oldUserCodes = '';

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

      this._languageRef = ref(this.database, `${key}/language`);
      this._codeRef = ref(this.database, `${key}/code`);
      this._usersRef = ref(this.database, `${key}/users`);

      set(child(this._usersRef, this.currentUser.code), this.currentUser);

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
        const transformedArray = Object.entries(f.val()).map(([key, value]: [string, any]) => ({ code: key, name: value.name, position: value.position, selection: value.selection }));
        this.users = transformedArray ?? this._defaultUsers;
        const newUserCodes = this.users.map(x => x.code).join();
        if (this.oldUserCodes !== newUserCodes) {
          this.oldUserCodes = newUserCodes;
          this.updateStyles(this.users, this.colors);
        }

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

  @HostListener('window:beforeunload') unloadNotification() {
    if (this.currentUser) {
      remove(child(this._usersRef, this.currentUser.code));
    }
  }

  editorInit(editor: MonacoStandaloneCodeEditor) {
    this.editor = editor;

    editor.onDidChangeCursorPosition(e => {
      if (this.currentUser) {
        this.currentUser.position.column = e.position.column;
        this.currentUser.position.lineNumber = e.position.lineNumber;
        set(child(this._usersRef, `${this.currentUser.code}/position`), this.currentUser.position);
      }
    });

    editor.onDidChangeCursorSelection(e => {
      if (this.currentUser) {
        this.currentUser.selection.begin.column = e.selection.startColumn;
        this.currentUser.selection.begin.lineNumber = e.selection.startLineNumber;
        this.currentUser.selection.end.column = e.selection.positionColumn;
        this.currentUser.selection.end.lineNumber = e.selection.positionLineNumber;
        set(child(this._usersRef, `${this.currentUser.code}/selection`), this.currentUser.selection);
      }
    });

    editor.onDidChangeModelContent((event) => {
      event.changes.forEach(change => {
        if (change.text && change.rangeLength === 0) {
          console.log('Text was inserted by typing:', change.text);

          if (this._codeRef) {
            set(this._codeRef, editor.getValue());
          }
        } else if (!change.text && change.rangeLength > 0) {
          console.log('Text was deleted by typing:', change.rangeLength, 'characters');

          if (this._codeRef) {
            set(this._codeRef, editor.getValue());
          }
        }
      });
    });
  }

  private async getCode(): Promise<string> {
    return (await get(this._codeRef!)).val() ?? this._defaultCode;
  }

  private updateUserOverlays() {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    this.users.forEach((user, i) => {
      if (user.code === this.currentUser?.code) {
        return;
      }

      this.createStyles(user, this.colors[i]);

      const position = user.position;

      if (position) {
        decorations.push({
          range: new monaco.Range(
            position.lineNumber,
            position.column,
            position.lineNumber,
            position.column),
          options: {
            className: `cursor-${user.code}`
          }
        });
      }

      const selection = user.selection;

      if (selection) {
        decorations.push({
          range: new monaco.Range(
            selection.begin.lineNumber,
            selection.begin.column,
            selection.end.lineNumber,
            selection.end.column
          ),
          options: {
            className: `highlight-${user.code}`
          }
        });
      }
    });

    this.oldDecorations = this.editor?.deltaDecorations(this.oldDecorations ?? [], decorations);
  }

  private removeStyles() {
    const styleElement = document.getElementById('dynamic-styles');

    if (styleElement) {
      document.head.removeChild(styleElement);
    }
  }

  private updateStyles(users: User[], colors: string[]) {
    this.removeStyles();

    users.forEach((user, i) => {
      if (user.code === this.currentUser?.code) {
        return;
      }

      this.createStyles(user, colors[i]);
    });
  }

  private createStyles(user: User, color: string) {
    const styles = `.cursor-${user.code} { border: 1px solid ${color}; } .cursor-${user.code}::after { content: '${user.name}'; position: absolute; top: 20px; left: 0; background-color: ${color}; color: white; padding: 1px; border: 1px solid ${color}; border-radius: 1px; font-size: 10px; line-height: 10px; white-space: nowrap; z-index: 1000; animation: fadeOut 3s forwards; } .highlight-${user.code} { border: 1px solid ${color}; background-color: ${color}; }`;
    const styleSheet = this.renderer.createElement('style');
    styleSheet.id = 'dynamic-styles'
    styleSheet.type = 'text/css';
    styleSheet.innerHTML = styles;
    this.renderer.appendChild(document.head, styleSheet);
  }
}