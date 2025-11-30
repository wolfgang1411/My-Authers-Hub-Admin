# Pricing & Royalty Component - Analysis and Fixes

## Core Issue: Author Percentage Sometimes Shows 100%

### Root Cause Analysis

1. **Initialization Race Condition**:

   - `initializeAuthorPercentageControls()` sets percent to 100 if no royalty found
   - Royalties may load AFTER controls are initialized
   - Effect may not trigger if royalties load before effect is set up
   - Multiple sync points with different timings cause conflicts

2. **Effect Dependency Issues**:

   - Effect watches `areFormsValid()` which depends on `isPricingValidForUser()`
   - `isPricingValidForUser()` depends on `pricingValidityForPublisher` signal
   - Signal may not update in time, causing effect to run with stale data
   - Effect condition `control.value !== roundedValue` may not catch all cases

3. **Multiple Sync Points**:
   - Initial sync at 500ms
   - Additional sync at 1200ms
   - Another sync at 2000ms
   - Effect sync on form validity change
   - Sync on royaltiesController valueChanges
   - These can conflict and overwrite each other

## Feature Requirements

### Pricing Features:

1. ✅ Publisher and superadmin can enter prices
2. ✅ MSP used for non-ebook platforms
3. ✅ ebookMsp used for ebook platforms
4. ✅ Superadmin-only platforms: not visible to publisher in pricing section
5. ✅ Publisher can skip pricing for admin-only platforms (no validation error)
6. ✅ Publisher cannot edit superadmin-set pricing (disabled with lock icon)

### Royalty Features:

1. ✅ Publisher can create royalties for all platforms (including superadmin-only)
2. ✅ Royalties for superadmin-only platforms created as DEACTIVE if no pricing
3. ✅ Superadmin can add pricing for superadmin-only platforms
4. ✅ When superadmin adds pricing, DEACTIVE royalties become ACTIVE
5. ✅ Default royalty percent divided between authors
6. ✅ Publisher gets remaining percentage (100 - sum of author percentages)
7. ✅ Publisher gets extra margin from customPrintCost - actualPrintCost difference
8. ✅ Royalty amounts calculated per platform
9. ✅ Author percentage inputs always enabled for editing

### Validation Features:

1. ✅ Form validation excludes superadmin-only platforms for publishers
2. ✅ Author controls enabled when forms are valid
3. ✅ Royalties can be created without pricing for superadmin-only platforms

## Issues Found

### 1. Author Percentage Prefill Issue

**Problem**: Sometimes shows 100% instead of saved value
**Root Cause**:

- `initializeAuthorPercentageControls()` defaults to 100
- Sync may not happen if royalties load after initialization
- Effect may not update if value is already 100

**Fix Strategy**:

- Remove default 100, use calculated default divided value
- Ensure sync happens AFTER royalties are loaded
- Make effect more aggressive about updating
- Add explicit sync when royalties load

### 2. Too Many API Calls

**Problem**: `updateRoyaltyAmounts()` called from many places
**Current Calls**:

- calculateRoyaltyAmountPerPerson subscription (debounce 600ms)
- Multiple setTimeout calls (100ms, 300ms, 400ms, 600ms)
- Effect on form validity change
- syncAuthorPercentagesToRoyalties (100ms timeout)
- calculatePublisherPercentage (100ms timeout)

**Fix Strategy**:

- Consolidate to single debounced call
- Use longer debounce time (800-1000ms)
- Remove redundant calls
- Only call when actual data changes

### 3. Race Conditions

**Problem**: Multiple async operations with different timings
**Fix Strategy**:

- Use proper reactive patterns
- Ensure effects run after data is loaded
- Add proper dependency tracking

## Test Cases Needed

### Pricing Tests:

1. Publisher can enter prices for regular platforms
2. Publisher cannot see superadmin-only platforms in pricing
3. Publisher cannot edit superadmin-set pricing
4. Superadmin can enter prices for all platforms
5. MSP calculation for non-ebook platforms
6. ebookMsp for ebook platforms

### Royalty Tests:

1. Author percentage prefill from saved royalties
2. Default division when no royalties exist
3. Publisher percentage calculation (100 - author sum)
4. Publisher extra margin from customPrintCost
5. Royalty creation for superadmin-only platforms (DEACTIVE)
6. Royalty activation when superadmin adds pricing

### Validation Tests:

1. Form validation excludes superadmin-only platforms for publishers
2. Author controls enabled when forms valid
3. Royalties can be created without pricing for superadmin-only platforms
