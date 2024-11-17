import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class GeneratorService {

  generateKey(): string {
    return Math.random().toString(36).substring(2);
  }
}
