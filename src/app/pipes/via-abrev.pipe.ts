// src/app/pipes/via-abrev.pipe.ts
import { Pipe, PipeTransform } from '@angular/core';
import { abrevTipoVia } from '../utils/sala.utils';

@Pipe({
  name: 'viaAbrev',
  standalone: true,
  pure: true
})
export class ViaAbrevPipe implements PipeTransform {
  transform(tipoVia?: string | null, fallbackOriginal: boolean = true): string | null {
    const r = abrevTipoVia(tipoVia);
    return r ?? (fallbackOriginal ? (tipoVia ?? null) : null);
  }
}
