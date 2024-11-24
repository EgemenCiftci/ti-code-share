import { Component, HostListener, inject, OnDestroy, OnInit, Renderer2 } from '@angular/core';
import { MonacoEditorConstructionOptions, MonacoStandaloneCodeEditor, MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { Database, ref, set, onValue, DatabaseReference, get, child, remove, onChildAdded, onChildRemoved, Unsubscribe } from '@angular/fire/database';
import { ActivatedRoute } from '@angular/router';
import { Languages } from '../../enums/languages';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSelect } from '@angular/material/select';
import { MatOption } from '@angular/material/core';
import { MatTooltip } from '@angular/material/tooltip';
import { Position } from 'src/app/models/position';
import { User } from 'src/app/models/user';
import { Selection } from 'src/app/models/selection';
import { Themes } from 'src/app/enums/themes';

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
  private database = inject(Database);
  private renderer = inject(Renderer2);

  languageEntries = Object.entries(Languages);
  themeEntries = Object.entries(Themes);

  private destroy$ = new Subject<void>();
  private defaultLanguage = this.languageEntries.find(f => f[1] == Languages.csharp)?.[0] ?? '';
  private defaultCode = '';
  private defaultTheme = this.themeEntries.find(f => f[1] == Themes.vs_dark)?.[0] ?? '';
  private defaultPosition: Position = { lineNumber: 1, column: 1 };
  private defaultSelection: Selection = { begin: { lineNumber: 0, column: 0 }, end: { lineNumber: 0, column: 0 } };
  private oldDecorations: string[] | undefined;
  private languageRef?: DatabaseReference;
  private codeRef?: DatabaseReference;
  private usersRef!: DatabaseReference;
  usersMap: Map<string, User> = new Map();
  private editor?: MonacoStandaloneCodeEditor;
  private key?: string;
  private currentUser?: User;
  private userUnsubscribesMap: Map<string, Unsubscribe> = new Map();

  formGroup: FormGroup = new FormGroup({
    userName: new FormControl({ value: localStorage.getItem('userName') ?? '', disabled: true }),
    key: new FormControl({ value: '', disabled: true }),
    language: new FormControl(this.defaultLanguage),
    code: new FormControl(undefined)
  });

  editorOptions: MonacoEditorConstructionOptions = {
    language: this.defaultLanguage,
    automaticLayout: true,
    theme: localStorage.getItem('theme')?.replace('_', '-') ?? this.defaultTheme
  };

  async ngOnInit() {
    const languageControl = this.formGroup.get('language');

    languageControl?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(async newValue => {
        this.editorOptions = { ...this.editorOptions, language: newValue ?? this.defaultLanguage };
        if (this.languageRef) {
          await set(this.languageRef, newValue);
        }
      });

    const codeControl = this.formGroup.get('code');

    this.route.paramMap
      .pipe(takeUntil(this.destroy$))
      .subscribe(async params => {
        this.key = params.get('key') ?? '';
        const currentUserCode = localStorage.getItem('userCode') ?? '';
        const currentUserName = localStorage.getItem('userName') ?? '';
        const currentUserColor = localStorage.getItem('color') ?? '';
        this.currentUser = {
          code: currentUserCode,
          name: currentUserName,
          color: currentUserColor,
          position: this.defaultPosition,
          selection: this.defaultSelection
        };
        this.usersMap.set(this.currentUser.code, this.currentUser);
        this.formGroup.get('key')?.patchValue(this.key);
        this.languageRef = ref(this.database, `${this.key}/language`);
        this.codeRef = ref(this.database, `${this.key}/code`);
        this.usersRef = ref(this.database, `${this.key}/users`);

        await set(child(this.usersRef, this.currentUser.code), this.currentUser);

        codeControl?.patchValue(await this.getCode());

        onValue(this.languageRef, f => {
          if (languageControl && f.val() !== languageControl.value) {
            languageControl.patchValue(f.val() ?? this.defaultLanguage);
          }
        });

        onValue(this.codeRef, f => {
          if (codeControl && f.val() !== codeControl.value) {
            codeControl.patchValue(f.val() ?? this.defaultCode);
          }
        });

        onChildAdded(this.usersRef, f => {
          // User added
          const user = f.val();

          if (user.code === currentUserCode) {
            return;
          }

          this.usersMap.set(user.code, user);
          this.addStyles(user);

          const unsubscribe = onValue(child(this.usersRef, user.code), f => {
            // User changed
            const user = f.val();
            const userInTheMap = this.usersMap.get(user.code);

            if (userInTheMap) {
              if (user.color !== userInTheMap.color) {
                // User color changed
                this.removeStyles(userInTheMap.code);
                userInTheMap.color = user.color;
                this.addStyles(userInTheMap);
              }

              if (user.name !== userInTheMap.name) {
                // User name changed
                userInTheMap.name = user.name;
              }

              userInTheMap.position = user.position;
              userInTheMap.selection = user.selection;
              this.updateUserOverlays(this.usersMap);
            }
          });

          this.userUnsubscribesMap.set(user.code, unsubscribe);
        });

        onChildRemoved(this.usersRef, f => {
          // User removed
          const user = f.val();

          if (user.code === currentUserCode) {
            return;
          }

          const unsubscribe = this.userUnsubscribesMap.get(user.code);
          if (unsubscribe) {
            unsubscribe();
          }
          this.usersMap.delete(user.code);
          this.removeStyles(user.code);
        });
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:beforeunload') unloadNotification() {
    if (this.currentUser) {
      remove(child(this.usersRef, this.currentUser.code));
    }
  }

  editorInit(editor: MonacoStandaloneCodeEditor) {
    this.editor = editor;

    editor.onDidChangeCursorPosition(e => {
      if (this.currentUser) {
        this.currentUser.position.column = e.position.column;
        this.currentUser.position.lineNumber = e.position.lineNumber;
        set(child(this.usersRef, `${this.currentUser.code}/position`), this.currentUser.position);
      }
    });

    editor.onDidChangeCursorSelection(e => {
      if (this.currentUser) {
        this.currentUser.selection.begin.column = e.selection.startColumn;
        this.currentUser.selection.begin.lineNumber = e.selection.startLineNumber;
        this.currentUser.selection.end.column = e.selection.endColumn;
        this.currentUser.selection.end.lineNumber = e.selection.endLineNumber;
        set(child(this.usersRef, `${this.currentUser.code}/selection`), this.currentUser.selection);
      }
    });

    editor.onDidChangeModelContent((event) => {
      event.changes.forEach(change => {
        if (change.text && change.rangeLength === 0) {
          if (this.codeRef) {
            set(this.codeRef, editor.getValue());
          }
        } else if (!change.text && change.rangeLength > 0) {
          if (this.codeRef) {
            set(this.codeRef, editor.getValue());
          }
        }
      });
    });
  }

  private async getCode(): Promise<string> {
    return (await get(this.codeRef!)).val() ?? this.defaultCode;
  }

  private updateUserOverlays(usersMap: Map<string, User>) {
    const decorations: monaco.editor.IModelDeltaDecoration[] = [];

    usersMap.forEach(user => {
      if (user.code === this.currentUser?.code) {
        return;
      }

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

  private removeStyles(userCode: string) {
    const styleElement = document.getElementById(`styles-${userCode}`);

    if (styleElement) {
      document.head.removeChild(styleElement);
    }
  }

  private addStyles(user: User) {
    const styles = `.cursor-${user.code} { border: 1px solid ${user.color}; } .cursor-${user.code}::after { content: '${user.name}'; position: absolute; top: 20px; left: 0; background-color: ${user.color}; color: white; padding: 1px; border: 1px solid ${user.color}; border-radius: 1px; font-size: 10px; line-height: 10px; white-space: nowrap; z-index: 1000; animation: fadeOut 3s forwards; } .highlight-${user.code} { border: 1px solid ${user.color}; background-color: ${user.color}; }`;
    const styleSheet = this.renderer.createElement('style');
    styleSheet.id = `styles-${user.code}`;
    styleSheet.type = 'text/css';
    styleSheet.innerHTML = styles;
    this.renderer.appendChild(document.head, styleSheet);
  }
}