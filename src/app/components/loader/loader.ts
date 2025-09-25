import { Component } from '@angular/core';
import { LoaderService } from '../../services/loader';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-loader',
  imports: [AsyncPipe],
  templateUrl: './loader.html',
  styleUrl: './loader.css',
})
export class Loader {
  isLoading$!: Observable<boolean>;

  constructor(private loader: LoaderService) {}

  ngOnInit() {
    this.isLoading$ = this.loader.isLoading$;
  }
}
