import {
  Directive,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import tippy, { Instance } from 'tippy.js';

@Directive({
  selector: '[appTippyTooltip]',
  standalone: true,
})
export class TippyTooltipDirective implements OnInit, OnDestroy {
  @Input() appTippyTooltip: string = '';
  @Input() tippyPlacement: 'top' | 'bottom' | 'left' | 'right' = 'top';

  private tippyInstance: Instance | null = null;

  constructor(private el: ElementRef<HTMLElement>) {}

  ngOnInit() {
    if (this.appTippyTooltip) {
      this.tippyInstance = tippy(this.el.nativeElement, {
        content: this.appTippyTooltip,
        placement: this.tippyPlacement,
        theme: 'light',
        arrow: true,
        animation: 'scale',
      });
    }
  }

  ngOnDestroy() {
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }
  }
}

