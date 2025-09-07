import { HttpErrorResponse } from '@angular/common/http';
import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root',
})
export class Logger {
  logError(error: any) {
    Swal.fire({
      icon: 'error',
      title: 'Error',
      html: this.getErrorText(error),
    });
  }

  private getErrorText(error: any) {
    let message = 'An unknown error occurred';

    // Angular HttpErrorResponse (from backend)
    if (error instanceof HttpErrorResponse) {
      const err = error.error;

      if (err) {
        // Case 1: Plain string
        if (typeof err === 'string') {
          message = err;
        }
        // Case 2: JSON with "message"
        else if (err.message) {
          message = err.message;
        }
        // Case 3: JSON with "error_description"
        else if (err.error_description) {
          message = err.error_description;
        }
        // Fallback
        else {
          message = JSON.stringify(err);
        }
      } else {
        message = error.message; // fallback (network/timeout)
      }
    }

    // Standard JS Error
    else if (error instanceof Error) {
      message = error.message;
    }

    // Plain string
    else if (typeof error === 'string') {
      message = error;
    }

    // Generic object
    else if (typeof error === 'object' && error !== null) {
      message = JSON.stringify(error);
    }

    console.error('[Error]:', message, error);
    return message;
  }
}
