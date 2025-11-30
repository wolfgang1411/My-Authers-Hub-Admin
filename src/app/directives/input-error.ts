import {
  Directive,
  ElementRef,
  Input,
  Optional,
  Renderer2,
  SimpleChanges,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import tippy, { Instance } from 'tippy.js';

@Directive({
  selector: '[appInputError]',
})
export class InputError {
  constructor(
    private el: ElementRef<HTMLInputElement>,
    @Optional() private control: NgControl,
    private renderer: Renderer2
  ) {}

  tooltipTitle?: string;
  placement: string = 'top';
  delay = 0;
  tooltip?: HTMLElement;
  offset = 10;
  private tippyInstance: Instance | null = null;

  exitstedError: string[] = [];

  @Input() isActive = false;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isActive'].currentValue) {
      this.validateError(this.control.status as any);
    }
  }

  ngOnDestroy() {
    if (this.tippyInstance) {
      this.tippyInstance.destroy();
    }
  }

  ngOnInit() {
    this.control.statusChanges?.subscribe((status) => {
      this.validateError(status);
    });
  }

  validateError(status: 'VALID' | 'INVALID') {
    if (this.isActive) {
      if (status === 'VALID') {
        this.exitstedError = [];
        this.hide();
      }
      if (status === 'INVALID' && this.control.errors) {
        const errors: string[] = [];
        Object.keys(this.control.errors).forEach((key) => {
          if (this.exitstedError.includes(key)) return;
          this.exitstedError.push(key);
          let text = '';

          const controlName =
            this.el?.nativeElement?.getAttribute('name') ||
            this.control?.name ||
            '';
          switch (key) {
            case 'required':
              text = `${controlName} is required!`;
              break;
            case 'pattern':
              text = `${controlName} has wrong pattern!`;
              break;
            case 'email':
              text = `${controlName} has wrong email format!`;
              break;
            case 'minlength':
              text = `${controlName} has wrong length! Required length: ${
                (this.control.errors as any)[key].requiredLength
              }`;
              break;
            case 'max':
              text = `${controlName} has wrong length! Max length: ${
                (this.control.errors as any)[key].max
              }`;
              break;
            case 'areEqual':
              text = `${controlName} must be equal!`;
              break;
            default:
              text = `${controlName}: ${key}`;
          }

          errors.push(text);
        });

        if (!errors.length) return;
        const errorText = errors.reduce((a, p) => a + '<br>' + p);
        this.tooltipTitle = errorText;

        this.show();
      }
    }
  }

  show() {
    if (this.tippyInstance) {
      this.tippyInstance.show();
      return;
    }
    this.tippyInstance = tippy(this.el.nativeElement, {
      content: this.tooltipTitle || '',
      trigger: 'manual',
      placement: 'top',
      showOnCreate: true,
      hideOnClick: false,
      allowHTML: true,
      zIndex: 99,
      animation: 'scale',
    });
  }

  hide() {
    if (this.tippyInstance) {
      this.tippyInstance.hide();
    }
  }
}
