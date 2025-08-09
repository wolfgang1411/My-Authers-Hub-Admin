import { Component, signal } from '@angular/core';
import { AuthorsService } from './authors-service';
import { debounceTime, Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import {Author} from '../../interfaces/Authors';

@Component({
  selector: 'app-authors',
  imports: [RouterLink , SharedModule],
  templateUrl: './authors.html',
  styleUrl: './authors.css'
})
export class Authors {
  constructor(private authorService: AuthorsService) {
  }
searchStr = new Subject<string>()

test!:Subject<string>;
authors = signal<Author[]>([]);


ngOnInit(): void {
 this.searchStr.pipe((debounceTime(400))
 ).subscribe((value) => {
   console.log('Search string:', value);
 });  

  this.authorService.getAuthors().then(({items}) => {
    this.authors.set(items);
    console.log('Fetched publishers:', this.authors());
  }).catch((error) => {
    console.error('Error fetching publishers:', error);
  });
}

}
