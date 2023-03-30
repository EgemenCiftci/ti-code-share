import { Component } from '@angular/core';

@Component({
  selector: 'app-user-info',
  templateUrl: './user-info.component.html',
  styleUrls: ['./user-info.component.css']
})
export class UserInfoComponent {
  private _name = '';

  get name(): string {
    return this._name;
  }

  set name(value: string) {
    if (value !== this._name) {
      this._name = value;
    }
  }

  okClick() {
    alert(this.name);
  }
}
