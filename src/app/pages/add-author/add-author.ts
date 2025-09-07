import { Component, inject,  } from '@angular/core';
import {FormBuilder, Validators, FormsModule, ReactiveFormsModule} from '@angular/forms';
import {BreakpointObserver} from '@angular/cdk/layout';
import {StepperOrientation, MatStepperModule} from '@angular/material/stepper';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {MatButtonModule} from '@angular/material/button';
import {MatInputModule} from '@angular/material/input';
import {MatFormFieldModule} from '@angular/material/form-field';
import {AsyncPipe} from '@angular/common';
import { SharedModule } from '../../modules/shared/shared-module';
import {MatSelectModule} from '@angular/material/select';
import {MatCardModule} from '@angular/material/card';
import { UploadFile } from "../../components/upload-file/upload-file";
import { Address,  createBankDetails, Author } from '../../interfaces';
import { AddressService } from '../../services/address-service';
import { BankDetailService } from '../../services/bank-detail-service';
import { AuthorsService } from '../authors/authors-service';
import Swal from 'sweetalert2';
import { ActivatedRoute } from '@angular/router';
import { Authors } from '../authors/authors';

@Component({
  selector: 'app-add-author',
  imports: [MatStepperModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    AsyncPipe,
    SharedModule,
    MatSelectModule,
    MatCardModule,UploadFile],
  templateUrl: './add-author.html',
  styleUrl: './add-author.css'
})
export class AddAuthor {
  constructor(private authorsService : AuthorsService,private addressService : AddressService , private bankDetailService :BankDetailService ,
    private route : ActivatedRoute
   ){
    const breakpointObserver = inject(BreakpointObserver);
    this.stepperOrientation = breakpointObserver
      .observe('(min-width: 800px)')
      .pipe(map(({matches}) => (matches ? 'horizontal' : 'vertical')));
      this.route.params.subscribe(({id , signupCode})=>{
  this.authorId = id;
  this.signupCode = signupCode
      })
  }
  authorId!: number;
  signupCode?:string;
  authorDetails? :  Author
  async ngOnInit()
  {
    if(this.authorId)
    {

      const response = await this.authorsService.getAuthorrById(this.authorId);
      this.authorDetails = response;
      this.prefillForm(response
  );  
      this.authorFormGroup.controls.signupCode.patchValue(this.signupCode || null);
      this.authorBankDetails.controls.signupCode.patchValue(this.signupCode || null)
      this.authorAddressDetails.controls.signupCode.patchValue(this.signupCode || null)
      
    }
  }

 private _formBuilder = inject(FormBuilder);
 stepperOrientation: Observable<StepperOrientation>;
 authorFormGroup = this._formBuilder.group({
  id:<number | null>null,
 name: ['', Validators.required],
 email:['',[Validators.required , Validators.email]],
 phoneNumber:['',Validators.required],
 username:['',Validators.required],
 about:['',Validators.required],
 authorImage:[''] ,
signupCode:<string | null>(null)});
 authorBankDetails= this._formBuilder.group({
  id:<number |null>null,
  name:['',Validators.required],
  accountNo:['',Validators.required],
  ifsc:['',Validators.required],
  panCardNo:['',Validators.required],
  accountType:['',Validators.required],
  signupCode:<string | null>(null)
 });

authorAddressDetails = this._formBuilder.group({
  id:<number| null>null,
  address:['',Validators.required],
  city : ['',Validators.required],
  state:['',Validators.required],
  country:['',Validators.required],
  pincode:['',Validators.required],
  signupCode:<string | null>(null)
 });

 prefillForm(authorDetails: Author) {
    this.authorFormGroup.patchValue({
      id: authorDetails.id,
      name:
        authorDetails.name,
      email: authorDetails.email,
      phoneNumber: authorDetails.phoneNumber,
      username: authorDetails.username,
      about:authorDetails.about
    });
    this.authorAddressDetails.patchValue({
      id: authorDetails.address[0]?.id,
      address: authorDetails.address[0]?.address,
      city: authorDetails.address[0]?.city,
      state: authorDetails.address[0]?.state,
      country: authorDetails.address[0]?.country,
      pincode: authorDetails.address[0]?.pincode,
    });
    this.authorBankDetails.patchValue({
      id: authorDetails.bankDetails?.[0]?.id,
      name: authorDetails.bankDetails?.[0]?.name,
      accountNo: authorDetails.bankDetails?.[0]?.accountNo,
      ifsc: authorDetails.bankDetails?.[0]?.ifsc,
      panCardNo: authorDetails.bankDetails?.[0]?.panCardNo,
      accountType: authorDetails.bankDetails?.[0]?.accountType,
    });
  }

async onSubmit() {
  const authorData = this.authorFormGroup.value;
  try {
    const response = await this.authorsService.createAuthor(authorData as Author) as Author;
    if (response && response.id) {
      const authorAddressData = {
        ...this.authorAddressDetails.value,
        autherId: response.id
      };
      await this.addressService.createOrUpdateAddress(authorAddressData as Address);

      const authorBankData = {
        ...this.authorBankDetails.value,
        autherId: response.id,
      };
      await this.bankDetailService.createOrUpdateBankDetail(authorBankData as createBankDetails);
    }
    Swal.fire({
      text:'You have successfully created author',
      title:'success',
      icon : 'success',
      heightAuto:false
    })
  } catch (error:any) {
    Swal.fire({
      title:'error',
      text:error.message,
      icon: error,
      heightAuto:false
    })
    
  }
}
}
