import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'controlAsAny',
})
export class ControlAsAnyPipe implements PipeTransform {
  transform(value: any): any {
    return value as any;
  }
}
