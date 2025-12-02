# Ticket Change Detection Implementation Plan

## Current Issues
1. Tickets are created even when no changes exist
2. All fields are sent in ticket payload even if unchanged
3. Media is always updated even if unchanged
4. Social media is always updated even if unchanged
5. No comparison with existing data before creating tickets

## Goals
1. Only create tickets when actual changes are detected
2. Only include changed fields in ticket payload
3. Only update media if it's actually new/changed
4. Only update social media if there are changes
5. Preserve current logic for direct updates (superadmin)

## Implementation Strategy

### Phase 1: Frontend Changes (add-author.ts)

#### 1.1 Fetch Existing Author Data
- Before processing updates, fetch current author data using `getAuthorrById`
- Store existing data for comparison

#### 1.2 Compare and Create Tickets Only for Changes

**For ADDRESS ticket:**
- Compare: address, city, state, country, pincode
- Only create ticket if at least one field changed
- Only include changed fields in payload

**For BANK ticket:**
- Compare: bankName, accountHolderName, accountNo, ifsc, panCardNo, accountType, gstNumber
- Only create ticket if at least one field changed
- Only include changed fields in payload

**For AUTHOR ticket:**
- Compare: authorName, authorEmail, authorContactNumber, authorAbout, authorUsername
- Only create ticket if at least one field changed
- Only include changed fields in payload

#### 1.3 Media Update Logic
- Compare existing media with new media
- Only update if:
  - New file is uploaded (media.file exists)
  - AND (old media doesn't exist OR new file is different)
- Skip update if no new file and existing media exists

#### 1.4 Social Media Update Logic
- Compare existing social media array with new array
- Only update if:
  - New entries added
  - Existing entries modified
  - Entries removed
- Skip if arrays are identical

### Phase 2: Backend Changes (update-ticket.service.ts)

#### 2.1 Add Change Detection in `create` Method
- Before creating ticket, fetch existing data
- Compare new values with existing values
- Only create ticket if changes detected
- Return appropriate message if no changes

#### 2.2 Field-Level Comparison
- For each ticket type, compare only provided fields
- Ignore null/undefined values in comparison
- Handle data type conversions (string trimming, etc.)

## Detailed Comparison Logic

### Address Comparison
```typescript
const existingAddress = author.address[0];
const hasAddressChanges = 
  (address && address.trim() !== existingAddress?.address) ||
  (city && city.trim() !== existingAddress?.city) ||
  (state && state.trim() !== existingAddress?.state) ||
  (country && country.trim() !== existingAddress?.country) ||
  (pincode && pincode.trim() !== existingAddress?.pincode);
```

### Bank Details Comparison
```typescript
const existingBank = author.bankDetails[0];
const hasBankChanges =
  (bankName && bankName.trim() !== existingBank?.name) ||
  (accountHolderName && accountHolderName.trim() !== existingBank?.accountHolderName) ||
  (accountNo && accountNo.trim() !== existingBank?.accountNo) ||
  (ifsc && ifsc.trim() !== existingBank?.ifsc) ||
  (panCardNo && panCardNo.trim() !== existingBank?.panCardNo) ||
  (accountType && accountType !== existingBank?.accountType) ||
  (gstNumber && gstNumber.trim() !== existingBank?.gstNumber);
```

### Author Details Comparison
```typescript
const existingAuthor = author;
const authorNameParts = authorName?.split(' ') || [];
const firstName = authorNameParts[0] || '';
const lastName = authorNameParts.slice(1).join(' ') || '';

const hasAuthorChanges =
  (authorName && (firstName !== existingAuthor.user.firstName || lastName !== existingAuthor.user.lastName)) ||
  (authorEmail && authorEmail.trim() !== existingAuthor.user.email) ||
  (authorContactNumber && authorContactNumber.trim() !== existingAuthor.user.phoneNumber) ||
  (authorAbout && authorAbout.trim() !== existingAuthor.about) ||
  (authorUsername && authorUsername.trim() !== existingAuthor.username);
```

### Media Comparison
```typescript
const existingMedia = author.medias?.[0];
const newMedia = mediaControl.value;

const shouldUpdateMedia = 
  newMedia?.file && // New file exists
  (!existingMedia || // No existing media
   newMedia.file.name !== existingMedia.name || // Different file
   newMedia.file.size !== existingMedia.size); // Different size
```

### Social Media Comparison
```typescript
const existingSocialMedia = author.socialMedias || [];
const newSocialMedia = socialMediaArray.controls
  .map(group => ({ type: group.value.type, url: group.value.url?.trim() }))
  .filter(item => item.type && item.url);

const hasSocialMediaChanges = 
  existingSocialMedia.length !== newSocialMedia.length ||
  existingSocialMedia.some((existing, index) => 
    existing.type !== newSocialMedia[index]?.type ||
    existing.url !== newSocialMedia[index]?.url
  );
```

## Error Handling

1. **If fetching existing data fails:**
   - Log error
   - Fall back to current behavior (create ticket with all fields)
   - Show warning to user

2. **If comparison logic fails:**
   - Log error
   - Fall back to current behavior
   - Don't block user

## Testing Scenarios

1. **No Changes:**
   - Submit form with no changes
   - Expected: No tickets created, no API calls for media/social

2. **Only Address Changed:**
   - Change only address fields
   - Expected: Only ADDRESS ticket created

3. **Only Bank Changed:**
   - Change only bank fields
   - Expected: Only BANK ticket created

4. **Only Author Details Changed:**
   - Change only author fields
   - Expected: Only AUTHOR ticket created

5. **Multiple Sections Changed:**
   - Change address and bank
   - Expected: Both ADDRESS and BANK tickets created

6. **Media Changed:**
   - Upload new image
   - Expected: Media updated, tickets created for other changes

7. **Media Unchanged:**
   - No new image uploaded
   - Expected: Media not updated

8. **Social Media Changed:**
   - Add/modify social media
   - Expected: Social media updated

9. **Social Media Unchanged:**
   - No changes to social media
   - Expected: Social media not updated

## Backward Compatibility

- Keep current logic for superadmin direct updates
- Keep current logic for new author creation
- Only apply change detection for update flow with tickets

## Implementation Order

1. ✅ Create plan document
2. ⏳ Modify frontend `handleAuthorUpdateFlow` method
3. ⏳ Add helper functions for comparison
4. ⏳ Modify backend `create` method in update-ticket service
5. ⏳ Test all scenarios
6. ⏳ Handle edge cases


