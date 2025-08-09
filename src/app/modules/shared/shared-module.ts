import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslatePipe } from '@ngx-translate/core';
import { AngularSvgIconModule } from 'angular-svg-icon';

@NgModule({
  declarations: [],
  imports: [CommonModule, TranslatePipe, AngularSvgIconModule],
  exports: [CommonModule, TranslatePipe, AngularSvgIconModule],
})
export class SharedModule {}
