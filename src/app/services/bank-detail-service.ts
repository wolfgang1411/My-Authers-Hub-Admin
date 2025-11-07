import { Injectable } from '@angular/core';
import { Server } from './server';
import { BankDetails, BankOption, createBankDetails } from '../interfaces';
import { Logger } from './logger';
import { LoaderService } from './loader';

@Injectable({
  providedIn: 'root',
})
export class BankDetailService {
  constructor(
    private serverService: Server,
    private logger: Logger,
    private loader: LoaderService
  ) {}
  async createOrUpdateBankDetail(
    bankDetail: createBankDetails
  ): Promise<BankDetails> {
    try {
      return await this.serverService[bankDetail.id ? 'patch' : 'post'](
        bankDetail.id ? `bank-details/${bankDetail.id}` : 'bank-details',
        bankDetail
      );
    } catch (error) {
      this.logger.logError(error);
      throw error;
    }
  }

  async fetchBankOptions() {
    try {
      return {
        data: [
          {
            BANK: 'Canara Bank',
            IFSC: 'CNRB0006781',
            BRANCH: 'BANGALORE BWSSB BRANCH',
            CENTRE: 'BANGALORE',
            DISTRICT: 'BANGALORE',
            STATE: 'KARNATAKA',
            ADDRESS:
              'CANARA BANK CAUVERY BHAVAN GROUND FLOOR KG ROAD BANGALORE BANGALORE KARNATAKA 560009',
            CONTACT: '+919999999999',
            IMPS: true,
            RTGS: true,
            CITY: 'BANGALORE',
            ISO3166: 'IN-KA',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'CNRB',
          },
          {
            BANK: 'Central Bank of India',
            IFSC: 'CBIN0283772',
            BRANCH: 'ILLUPUR',
            CENTRE: 'ILLUPPUR',
            DISTRICT: 'ILLUPPUR',
            STATE: 'TAMIL NADU',
            ADDRESS:
              '16 D GURU COMPLEX,1ST FLOOR,SIVAN KOIL STREET,ILLUPPUR,DIST  PUDUKOTTAI,TAMILNADU 622102',
            CONTACT: '+912222612008',
            IMPS: true,
            RTGS: true,
            CITY: 'PUDUKKOTTAI',
            ISO3166: 'IN-TN',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'CBIN',
          },
          {
            BANK: 'IDBI',
            IFSC: 'IBKL0000831',
            BRANCH: 'RAC JAMSHEDPUR',
            CENTRE: 'JAMSHEDPUR',
            DISTRICT: 'JAMSHEDPUR',
            STATE: 'JHARKHAND',
            ADDRESS:
              'JAMSHEDPUR RAC  1ST FLOOR SHANTINIKETAN BUILDING  BISTUPUR MAIN ROAD JAMSHEDPUR 831001',
            CONTACT: '+919599504646',
            IMPS: true,
            RTGS: true,
            CITY: 'PURBI SINGHBHUM',
            ISO3166: 'IN-JH',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'IBKL',
          },
          {
            BANK: 'Bank of Baroda',
            IFSC: 'BARB0VJMAPU',
            BRANCH: 'MAPUCA,GOA',
            CENTRE: 'MAPUSA',
            DISTRICT: 'MAPUSA',
            STATE: 'GOA',
            ADDRESS:
              'MAPUSA RESIDENCY , MAPUCA , NORTH GOA DIST , MAPUCA , 403507',
            CONTACT: '+910221800223344',
            IMPS: true,
            RTGS: true,
            CITY: 'NORTH GOA',
            ISO3166: 'IN-GA',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'BARB',
          },
          {
            BANK: 'Indian Bank',
            IFSC: 'IDIB000P051',
            BRANCH: 'PUDUNAGARAM',
            CENTRE: 'PALAKKAD',
            DISTRICT: 'PALAKKAD',
            STATE: 'KERALA',
            ADDRESS:
              '3/65 BANGLE STREET PUDUNAGARAMPALAKKAD MAIN ROAD PALAKKAD PUDUNAGARAM  PIN 678503',
            CONTACT: '+914923252239',
            IMPS: true,
            RTGS: true,
            CITY: 'PALAKKAD',
            ISO3166: 'IN-KL',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'IDIB',
          },
          {
            BANK: 'Karur Vysya Bank',
            IFSC: 'KVBL0001422',
            BRANCH: 'ONGOLE',
            CENTRE: 'ONGOLE',
            DISTRICT: 'ONGOLE',
            STATE: 'ANDHRA PRADESH',
            ADDRESS: '37-1-172,KURNOOL ROAD I FLOOR,SARAVANA COMPLEX, ONGOLE',
            CONTACT: '+912222654261',
            IMPS: true,
            RTGS: true,
            CITY: 'ONGOLE',
            ISO3166: 'IN-AP',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'KVBL',
          },
          {
            BANK: 'Gujarat State Co-operative Bank',
            IFSC: 'GSCB0UMNSBL',
            BRANCH: 'THE MANDAL NAGRIK SAHAKARI BANK LTD',
            CENTRE: 'AHMEDABAD',
            DISTRICT: 'AHMEDABAD',
            STATE: 'GUJARAT',
            ADDRESS:
              'THE MANDAL NAGRIK SAHAKARI BANK LTD.MANDAL-382130 DIST.AHMEDABAD',
            CONTACT: '+912715253820',
            IMPS: true,
            RTGS: true,
            CITY: 'AHMADABAD',
            ISO3166: 'IN-GJ',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'GSCB',
          },
          {
            BANK: 'Canara Bank',
            IFSC: 'CNRB0007354',
            BRANCH: 'HUSSAINABAD',
            CENTRE: 'HUSSAINABAD',
            DISTRICT: 'HUSSAINABAD',
            STATE: 'JHARKHAND',
            ADDRESS: 'UMPDPPSTHUSSNBDPMUDSTHHND822116',
            CONTACT: '',
            IMPS: true,
            RTGS: true,
            CITY: 'HUSSAINABAD',
            ISO3166: 'IN-JH',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'CNRB',
          },
          {
            BANK: 'HDFC Bank',
            IFSC: 'HDFC0007411',
            BRANCH: 'MANINAGAR III',
            CENTRE: 'AHMADABAD',
            DISTRICT: 'AHMADABAD',
            STATE: 'GUJARAT',
            ADDRESS:
              'SHOP NO 1 TO 4 SHREEKAR AVENUE NEAR GOPAL CHOK MANINAGAR AHMADABAD GUJARAT 380028',
            CONTACT: '+917961606161',
            IMPS: true,
            RTGS: true,
            CITY: 'AHMADABAD',
            ISO3166: 'IN-GJ',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: 'HDFCINBB',
            BANKCODE: 'HDFC',
          },
          {
            BANK: 'ICICI Bank',
            IFSC: 'ICIC0007958',
            BRANCH: 'BALAMPUR',
            CENTRE: 'BHOPAL',
            DISTRICT: 'BHOPAL',
            STATE: 'WEST BENGAL',
            ADDRESS:
              '99 VIDISHA ROAD BALAMPUR DIST BHOPAL MADHYA PRADESH 462010',
            CONTACT: '',
            IMPS: true,
            RTGS: true,
            CITY: 'BHOPAL',
            ISO3166: 'IN-WB',
            NEFT: true,
            MICR: null,
            UPI: true,
            SWIFT: null,
            BANKCODE: 'ICIC',
          },
        ],
        hasNext: true,
        count: 178066,
      };
      // return await this.loader.loadPromise(
      //   this.serverService.get<{ data: BankOption[] }>(
      //     `https://ifsc.razorpay.com/search`
      //   )
      // );
    } catch (error) {
      throw error;
    }
  }
}
