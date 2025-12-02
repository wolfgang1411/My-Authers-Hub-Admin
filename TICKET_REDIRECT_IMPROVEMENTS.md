# Ticket Redirect Improvements

## Problem
After raising update tickets, users were being redirected to the list pages (/author or /publisher) instead of the update tickets page where they could view their raised tickets.

## Solution Implemented

### 1. Return Boolean from Update Flow Methods

Both `handleAuthorUpdateFlow()` and `handlePublisherUpdateFlow()` now return `Promise<boolean>` indicating whether tickets were actually raised.

**Add Author (`add-author.ts`):**
```typescript
async handleAuthorUpdateFlow(authorData: Author): Promise<boolean> {
  let ticketsRaised = false;
  
  // ... ticket creation logic ...
  
  if (hasValues) {
    await this.userService.raisingTicket(payload);
    ticketsRaised = true;
  }
  
  // Show success message but don't redirect here
  if (ticketsRaised) {
    await Swal.fire({
      icon: 'success',
      text: 'Update ticket raised successfully',
      title: 'Success',
      heightAuto: false,
    });
  }
  
  return ticketsRaised;
}
```

**Add Publisher (`add-publisher.ts`):**
```typescript
async handlePublisherUpdateFlow(publisherData: Publishers): Promise<boolean> {
  let ticketsRaised = false;
  
  // ... ticket creation logic ...
  
  if (hasValues) {
    await this.userService.raisingTicket(payload);
    ticketsRaised = true;
  }
  
  // Show success message but don't redirect here
  if (ticketsRaised) {
    await Swal.fire({
      icon: 'success',
      title: 'Success',
      text: 'Update ticket raised successfully',
      heightAuto: false,
    });
  }
  
  return ticketsRaised;
}
```

### 2. Conditional Redirect in onSubmit()

**Add Author (`add-author.ts`):**
```typescript
async onSubmit() {
  try {
    let ticketsWereRaised = false;

    if (this.loggedInUser()?.accessLevel === 'SUPERADMIN' || !this.authorId) {
      await this.handleNewOrSuperAdminAuthorSubmission(authorData);
    } else {
      if (this.authorDetails()?.status === AuthorStatus.Pending) {
        await this.handleNewOrSuperAdminAuthorSubmission(authorData);
      } else {
        ticketsWereRaised = await this.handleAuthorUpdateFlow(authorData);
      }
    }

    // Redirect based on whether tickets were raised
    if (this.signupCode) {
      this.router.navigate(['/login']);
    } else if (ticketsWereRaised) {
      // Navigate to update tickets page with appropriate tab
      const isAuthor = this.loggedInUser()?.accessLevel === 'AUTHER';
      this.router.navigate(['/update-tickets'], {
        queryParams: { tab: isAuthor ? 'author' : 'publisher' }
      });
    } else {
      this.router.navigate(['/author']);
    }
  } catch (error: any) {}
}
```

**Add Publisher (`add-publisher.ts`):**
```typescript
async onSubmit() {
  try {
    let ticketsWereRaised = false;

    if (
      this.loggedInUser()?.accessLevel === 'SUPERADMIN' ||
      !this.publisherId
    ) {
      await this.handleNewOrSuperAdminSubmission(publisherData);
    } else {
      ticketsWereRaised = await this.handlePublisherUpdateFlow(publisherData);
    }

    // Redirect based on whether tickets were raised
    if (this.signupCode) {
      this.router.navigate(['/login']);
    } else if (ticketsWereRaised) {
      // Navigate to update tickets page
      this.router.navigate(['/update-tickets'], {
        queryParams: { tab: 'publisher' }
      });
    } else {
      this.router.navigate(['/publisher']);
    }
  } catch (error) {
    console.log(error);
  }
}
```

## Redirect Logic Flow

### For Authors
1. Author edits their profile on `/author/:id` page
2. Changes detected → Tickets raised
3. Success message shown
4. **Redirects to:** `http://localhost:4200/update-tickets?tab=author`

### For Publishers Editing Authors
1. Publisher edits an author on `/author/:id` page
2. Changes detected → Tickets raised
3. Success message shown
4. **Redirects to:** `http://localhost:4200/update-tickets?tab=publisher`

### For Publishers Editing Own Profile
1. Publisher edits their profile on `/publisher/:id` page
2. Changes detected → Tickets raised
3. Success message shown
4. **Redirects to:** `http://localhost:4200/update-tickets?tab=publisher`

### For Publishers Editing Sub-Publishers
1. Publisher edits sub-publisher on `/publisher/:id` page
2. Changes detected → Tickets raised
3. Success message shown
4. **Redirects to:** `http://localhost:4200/update-tickets?tab=publisher`

### For Superadmin or New Records
1. Superadmin creates/edits records
2. Direct save (no tickets)
3. **Redirects to:** List page (`/author` or `/publisher`)

### For Pending Status Records
1. User edits pending record
2. Direct save (no tickets needed for pending records)
3. **Redirects to:** List page (`/author` or `/publisher`)

## Benefits

✅ **Better UX** - Users immediately see their raised tickets
✅ **Clear feedback** - Users know their ticket was created and can view it
✅ **Appropriate tab** - Authors see author tab, publishers see publisher tab
✅ **No confusion** - Only redirects to tickets page when tickets are actually raised
✅ **Maintains existing flow** - Direct saves still go to list pages

## Testing Checklist

- [x] Author edits own profile → Redirects to `/update-tickets?tab=author`
- [x] Publisher edits author → Redirects to `/update-tickets?tab=publisher`
- [x] Publisher edits own profile → Redirects to `/update-tickets?tab=publisher`
- [x] Publisher edits sub-publisher → Redirects to `/update-tickets?tab=publisher`
- [x] Superadmin edits anything → Redirects to list page (no tickets)
- [x] User edits pending record → Redirects to list page (no tickets)
- [x] Signup flow → Redirects to login page

