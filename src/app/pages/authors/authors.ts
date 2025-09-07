import { Component, signal } from '@angular/core';
import { AuthorsService } from './authors-service';
import { debounceTime, Subject } from 'rxjs';
import { RouterLink } from '@angular/router';
import { SharedModule } from '../../modules/shared/shared-module';
import {Author, AuthorResponse} from '../../interfaces/Authors';
import { MatTableDataSource } from '@angular/material/table';
import { ListTable } from "../../components/list-table/list-table";
import { MatIcon } from '@angular/material/icon';
import { MatButton } from '@angular/material/button';
import { MatIconButton } from '@angular/material/button';
import { InviteDialog } from '../../components/invite-dialog/invite-dialog';
import { Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { Invite } from '../../interfaces/Invite';
import Swal from 'sweetalert2';
import { PublisherService } from '../publisher/publisher-service';

@Component({
  selector: 'app-authors',
  imports: [SharedModule, ListTable, RouterLink, MatIcon,MatButton, MatIconButton],
  templateUrl: './authors.html',
  styleUrl: './authors.css'
})
export class Authors {
  constructor(private authorService: AuthorsService , private dialog: MatDialog,
    private publisherService: PublisherService
  ) {
    
  }
searchStr = new Subject<string>()

test!:Subject<string>;
authors = signal<Author[]>([]);
displayedColumns: string[] =['serial',"name","emailid","phonenumber","numberoftitles","royaltiesearned","actions"]
dataSource =new MatTableDataSource<AuthorResponse>();

ngOnInit(): void {
 this.searchStr.pipe((debounceTime(400))
 ).subscribe((value) => {
   console.log('Search string:', value);
 });  

this.authorService.getAuthors().then(({items}) => {
  this.authors.set(items);
  const mapped = items.map((author, idx) => ({
    serial: idx + 1,
   name:author.username,
   emailid:author.email,
   phonenumber:author.phoneNumber,
   numberoftitles:author.titles ? author.titles.length  : 0,
   royaltiesearned:author.Royalty && author.Royalty.length ? author.Royalty.reduce((acc, royalty)=>{
    return acc+royalty.percentage 
   },0) : 0,
   actions:''
  }));
  this.dataSource.data = mapped;
  this.displayedColumns = Object.keys(mapped[0]);

  console.log('Fetched publishers:', this.authors());
}).catch((error) => {
  console.error('Error fetching publishers:', error);
});
}
 inviteAuthor(): void {
    const dialogRef = this.dialog.open(InviteDialog, {
      data: {
        onSave: async(email:string) => {
           const inviteData = {
                    email: email,
                    type: 'AUTHER'
                    }
                   const response=  await this.publisherService.sendInviteLink(inviteData as Invite);
                   if(response)
                   {
                    dialogRef.close();
                    Swal.fire({
                      title:'success',
                      html : `You have successfully sent the invite to <b>${email}</b>`,
                      icon : 'success',
                      heightAuto:false
                    })
                   }
        },
        onClose: () => dialogRef.close(),
        heading: 'Please enter Email Address',
        cancelButtonLabel: 'Cancel',
        saveButtonLabel: 'Send Invite',
        placeholder:'abc@gmail.com',
        validators:[Validators.required , Validators.email]
      },
    });
  }
}
