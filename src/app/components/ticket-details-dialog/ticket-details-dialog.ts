import { CommonModule } from '@angular/common';
import { Component, computed, Inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UpdateTicketType } from '../../interfaces';

interface FieldChange {
  field: string;
  label: string;
  before: string;
  after: string;
}

interface TicketDetailsDialogData {
  ticket: any;
  requestedBy: string;
  createdAt: string;
  status: string;
  changesList: string[];
  onApprove?: (ticket: any) => Promise<void>;
  onReject?: (ticket: any) => Promise<void>;
  isSuperAdmin?: boolean;
}

@Component({
  selector: 'app-ticket-details-dialog',
  imports: [MatButtonModule, CommonModule, MatIconModule],
  templateUrl: './ticket-details-dialog.html',
  styleUrl: './ticket-details-dialog.css',
})
export class TicketDetailsDialog {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: TicketDetailsDialogData,
    private dialogRef: MatDialogRef<TicketDetailsDialog>,
  ) {
    this.processChanges();
  }

  changes = signal<FieldChange[]>([]);
  isApproving = signal(false);
  isRejecting = signal(false);

  // Computed values for display
  ticketType = computed(() => this.data?.ticket?.type || 'N/A');
  ticketStatus = computed(() => this.data?.ticket?.status || 'N/A');
  requestedBy = computed(() => this.data?.requestedBy || 'N/A');
  createdAt = computed(() => this.data?.createdAt || 'N/A');
  isSuperAdmin = computed(() => this.data?.isSuperAdmin || false);
  isPending = computed(() => this.ticketStatus() === 'PENDING');
  approvedBy = computed(() => {
    const approvedBy = this.data?.ticket?.approvedBy;
    if (!approvedBy) return null;
    return approvedBy.firstName && approvedBy.lastName
      ? `${approvedBy.firstName} ${approvedBy.lastName}`
      : approvedBy.email || 'N/A';
  });
  approvedAt = computed(() => {
    const approvedAt = this.data?.ticket?.approvedAt;
    return approvedAt ? new Date(approvedAt).toLocaleString() : null;
  });

  /**
   * Process changes to show before/after comparison
   */
  private processChanges(): void {
    const ticket = this.data?.ticket;
    if (!ticket) return;

    const ticketData = ticket.data || {};
    const currentData = ticket.currentData || {};
    const changes: FieldChange[] = [];

    switch (ticket.type) {
      case UpdateTicketType.ADDRESS:
        this.processAddressChanges(ticketData, currentData, changes);
        break;
      case UpdateTicketType.BANK:
        this.processBankChanges(ticketData, currentData, changes);
        break;
      case UpdateTicketType.AUTHOR:
        this.processAuthorChanges(ticketData, currentData, changes);
        break;
      case UpdateTicketType.PUBLISHER:
        this.processPublisherChanges(ticketData, currentData, changes);
        break;
    }

    this.changes.set(changes);
  }

  private processAddressChanges(
    ticketData: any,
    currentData: any,
    changes: FieldChange[],
  ): void {
    if (ticketData.address && currentData?.address !== ticketData?.address) {
      changes.push({
        field: 'address',
        label: 'Address',
        before: currentData?.address || 'N/A',
        after: ticketData.address,
      });
    }
    if (ticketData.city && currentData?.city !== ticketData?.city) {
      changes.push({
        field: 'city',
        label: 'City',
        before: currentData?.city || 'N/A',
        after: ticketData.city,
      });
    }
    if (ticketData.state && currentData?.state !== ticketData?.state) {
      changes.push({
        field: 'state',
        label: 'State',
        before: currentData?.state || 'N/A',
        after: ticketData.state,
      });
    }
    if (ticketData.country && currentData?.country !== ticketData?.country) {
      changes.push({
        field: 'country',
        label: 'Country',
        before: currentData?.country || 'N/A',
        after: ticketData.country,
      });
    }
    if (ticketData.pincode && currentData?.pincode !== ticketData?.pincode) {
      changes.push({
        field: 'pincode',
        label: 'Pincode',
        before: currentData?.pincode || 'N/A',
        after: ticketData.pincode,
      });
    }
  }

  private processBankChanges(
    ticketData: any,
    currentData: any,
    changes: FieldChange[],
  ): void {
    if (ticketData.bankName && currentData.bankName !== ticketData.bankName) {
      changes.push({
        field: 'bankName',
        label: 'Bank Name',
        before: currentData?.bankName || 'N/A',
        after: ticketData.bankName,
      });
    }
    if (
      ticketData.accountHolderName &&
      currentData.accountHolderName !== ticketData.accountHolderName
    ) {
      changes.push({
        field: 'accountHolderName',
        label: 'Account Holder Name',
        before: currentData?.accountHolderName || 'N/A',
        after: ticketData.accountHolderName,
      });
    }
    if (
      ticketData.accountNo &&
      currentData.accountNo !== ticketData.accountNo
    ) {
      changes.push({
        field: 'accountNo',
        label: 'Account Number',
        before: currentData?.accountNo || 'N/A',
        after: ticketData.accountNo,
      });
    }
    if (ticketData.ifsc && currentData.ifsc !== ticketData.ifsc) {
      changes.push({
        field: 'ifsc',
        label: 'IFSC Code',
        before: currentData?.ifsc || 'N/A',
        after: ticketData.ifsc,
      });
    }
    if (
      ticketData.panCardNo &&
      currentData.panCardNo !== ticketData.panCardNo
    ) {
      changes.push({
        field: 'panCardNo',
        label: 'PAN Card Number',
        before: currentData?.panCardNo || 'N/A',
        after: ticketData.panCardNo,
      });
    }
    if (
      ticketData.accountType &&
      currentData.accountType !== ticketData.accountType
    ) {
      changes.push({
        field: 'accountType',
        label: 'Account Type',
        before: currentData?.accountType || 'N/A',
        after: ticketData.accountType,
      });
    }
    if (
      ticketData.gstNumber &&
      currentData.gstNumber !== ticketData.gstNumber
    ) {
      changes.push({
        field: 'gstNumber',
        label: 'GST Number',
        before: currentData?.gstNumber || 'N/A',
        after: ticketData.gstNumber,
      });
    }
  }

  private processAuthorChanges(
    ticketData: any,
    currentData: any,
    changes: FieldChange[],
  ): void {
    // Backend stores with 'author' prefix
    if (
      ticketData.authorName &&
      currentData.authorName !== ticketData.authorName
    ) {
      changes.push({
        field: 'authorName',
        label: 'Name',
        before: currentData?.authorName || 'N/A',
        after: ticketData.authorName,
      });
    }
    if (
      ticketData.authorEmail &&
      currentData.authorEmail !== ticketData.authorEmail
    ) {
      changes.push({
        field: 'authorEmail',
        label: 'Email',
        before: currentData?.authorEmail || 'N/A',
        after: ticketData.authorEmail,
      });
    }
    if (
      ticketData.authorContactNumber &&
      currentData.authorContactNumber !== ticketData.authorContactNumber
    ) {
      changes.push({
        field: 'authorContactNumber',
        label: 'Phone Number',
        before: currentData?.authorContactNumber || 'N/A',
        after: ticketData.authorContactNumber,
      });
    }
    if (
      ticketData.authorAbout &&
      currentData.authorAbout !== ticketData.authorAbout
    ) {
      changes.push({
        field: 'authorAbout',
        label: 'About',
        before: currentData?.authorAbout || 'N/A',
        after: ticketData.authorAbout,
      });
    }
    if (
      ticketData.authorUsername &&
      currentData.authorUsername !== ticketData.authorUsername
    ) {
      changes.push({
        field: 'authorUsername',
        label: 'Username',
        before: currentData?.authorUsername || 'N/A',
        after: ticketData.authorUsername,
      });
    }
  }

  private processPublisherChanges(
    ticketData: any,
    currentData: any,
    changes: FieldChange[],
  ): void {
    // Backend stores with 'publisher' prefix
    if (
      ticketData.publisherName &&
      currentData.publisherName !== ticketData.publisherName
    ) {
      changes.push({
        field: 'publisherName',
        label: 'Publisher Name',
        before: currentData?.publisherName || 'N/A',
        after: ticketData.publisherName,
      });
    }
    if (
      ticketData.publisherEmail &&
      currentData.publisherEmail !== ticketData.publisherEmail
    ) {
      changes.push({
        field: 'publisherEmail',
        label: 'Email',
        before: currentData?.publisherEmail || 'N/A',
        after: ticketData.publisherEmail,
      });
    }
    if (
      ticketData.publisherDesignation &&
      currentData.publisherDesignation !== ticketData.publisherDesignation
    ) {
      changes.push({
        field: 'publisherDesignation',
        label: 'Designation',
        before: currentData?.publisherDesignation || 'N/A',
        after: ticketData.publisherDesignation,
      });
    }
    if (
      ticketData.publisherPocName &&
      currentData.publisherPocName !== ticketData.publisherPocName
    ) {
      changes.push({
        field: 'publisherPocName',
        label: 'POC Name',
        before: currentData?.publisherPocName || 'N/A',
        after: ticketData.publisherPocName,
      });
    }
    if (
      ticketData.publisherPocEmail &&
      currentData.publisherPocEmail !== ticketData.publisherPocEmail
    ) {
      changes.push({
        field: 'publisherPocEmail',
        label: 'POC Email',
        before: currentData?.publisherPocEmail || 'N/A',
        after: ticketData.publisherPocEmail,
      });
    }
    if (
      ticketData.publisherPocPhoneNumber &&
      currentData.publisherPocPhoneNumber !== ticketData.publisherPocPhoneNumber
    ) {
      changes.push({
        field: 'publisherPocPhoneNumber',
        label: 'POC Phone',
        before: currentData?.publisherPocPhoneNumber || 'N/A',
        after: ticketData.publisherPocPhoneNumber,
      });
    }
  }

  async onApprove(): Promise<void> {
    if (this.data?.onApprove && this.data?.ticket) {
      this.isApproving.set(true);
      try {
        await this.data.onApprove(this.data.ticket);
        this.dialogRef.close();
      } catch (error) {
        console.error('Error approving ticket:', error);
      } finally {
        this.isApproving.set(false);
      }
    }
  }

  async onReject(): Promise<void> {
    if (this.data?.onReject && this.data?.ticket) {
      this.isRejecting.set(true);
      try {
        await this.data.onReject(this.data.ticket);
        this.dialogRef.close();
      } catch (error) {
        console.error('Error rejecting ticket:', error);
      } finally {
        this.isRejecting.set(false);
      }
    }
  }

  close() {
    this.dialogRef.close();
  }
}
