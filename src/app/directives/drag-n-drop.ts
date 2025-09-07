import { Directive, EventEmitter, HostBinding, HostListener, Output } from '@angular/core';

@Directive({
  selector: '[appDragNDrop]'
})
export class DragNDrop {
  @HostBinding('class.fileover') fileOver = false;
@Output() fileDropped = new EventEmitter<any>()

@HostListener('dragover', ['$event']) onDragOver(evt: DragEvent): void {
  evt.preventDefault();
  evt.stopPropagation();
   this.fileOver = true;

}

@HostListener('dragleave', ['$event']) public onDragLeave(evt:DragEvent) {
  evt.preventDefault();
  evt.stopPropagation();
  console.log('Drag Leave');
  this.fileOver = false;

}

// Drop Listener
@HostListener('drop', ['$event']) public ondrop(evt:DragEvent) {
  evt.preventDefault();
  evt.stopPropagation();
  this.fileOver = false;
  if (evt.dataTransfer && evt.dataTransfer.files) {
    let files = evt.dataTransfer.files;
    if (files.length > 0) {
      this.fileDropped.emit(files);
    }
  }
}

}
