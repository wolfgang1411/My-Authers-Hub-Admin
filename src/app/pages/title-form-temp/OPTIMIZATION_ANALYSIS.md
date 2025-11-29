# Title Form Temp - Optimization Analysis

## Issues Identified

### 1. Excessive setTimeout Usage (14 instances)
**Problem**: Using setTimeout to work around change detection issues is an anti-pattern
**Locations**:
- Line 201: `onSelectDocumentsReady()` - scrollIntoView
- Line 301: `goToNextStep()` - stepper navigation
- Line 328: `goToNextStep()` - nested setTimeout
- Line 365: `navigateStepperTo()` - stepper navigation
- Line 378: `setupStepperStepTracking()` - initialization
- Line 382: `setupStepperStepTracking()` - retry logic
- Line 398: `setupStepperStepTracking()` - calculatePrintingCost
- Line 418: `setupStepperStepTracking()` - calculatePrintingCost
- Line 482: `onAuthorChangeChild()` - updateAuthorPrintPriceValidators
- Line 1090: `prefillFormData()` - calculateBlackAndWhitePages
- Line 2171: `onTitleSubmit()` - goToNextStep
- Line 2238: `onMediaUpload()` - calculateBlackAndWhitePages
- Line 2323: `onMediaUpload()` - calculateBlackAndWhitePages

**Solution**: Replace with:
- `afterNextRender()` for DOM access
- `ChangeDetectorRef.detectChanges()` for change detection
- `queueMicrotask()` for microtask queue
- Proper async/await patterns

### 2. Change Detection Strategy
**Problem**: Default change detection strategy causes unnecessary checks
**Solution**: Implement `ChangeDetectionStrategy.OnPush`

### 3. Multiple valueChanges Subscriptions
**Problem**: 21+ valueChanges subscriptions can cause performance issues
**Locations**:
- Line 582-586: publisher id valueChanges
- Line 643-649: publishingType valueChanges
- Line 1769-1792: insideCover valueChanges
- Line 1799-1836: combineLatest for printing fields
- Child components also have multiple subscriptions

**Solution**: 
- Consolidate related subscriptions
- Use signals where possible
- Use `distinctUntilChanged()` and `debounceTime()` more effectively

### 4. Unnecessary Method Calls
**Problem**: Methods called multiple times or unnecessarily
**Examples**:
- `calculatePrintingCost()` called multiple times with setTimeout
- `updateAuthorPrintPriceValidators()` called with setTimeout
- `ensurePricingArrayHasAllPlatforms()` called multiple times
- `mapRoyaltiesArray()` called in effect and multiple places

**Solution**: 
- Add guards to prevent duplicate calls
- Use computed signals for derived state
- Cache results where appropriate

### 5. Complex Stepper Tracking
**Problem**: `setupStepperStepTracking()` has nested setTimeout and retry logic
**Solution**: Simplify using `afterNextRender()` and proper lifecycle hooks

### 6. Duplicate Logic
**Problem**: Similar validation and data mapping logic repeated
**Examples**:
- Pricing validation logic duplicated in `onPricingSubmit()` and `onPricingAndRoyaltySubmit()`
- Platform filtering logic repeated multiple times
- Error message generation duplicated

**Solution**: Extract to reusable methods

### 7. Value Changed After Checked Errors
**Problem**: setTimeout is used to avoid these errors, but proper Angular patterns should be used
**Solution**: 
- Use `ChangeDetectorRef.detectChanges()` or `markForCheck()`
- Use `afterNextRender()` for DOM operations
- Use `queueMicrotask()` for microtask queue operations

## Optimization Plan

### Phase 1: Change Detection
1. Add `ChangeDetectionStrategy.OnPush`
2. Add `ChangeDetectorRef` injection
3. Replace setTimeout with proper Angular patterns

### Phase 2: Subscription Optimization
1. Consolidate valueChanges subscriptions
2. Use signals for reactive state
3. Optimize debounceTime and distinctUntilChanged usage

### Phase 3: Method Optimization
1. Remove unnecessary method calls
2. Add guards to prevent duplicate calls
3. Extract duplicate logic to reusable methods

### Phase 4: Stepper Optimization
1. Simplify stepper tracking
2. Remove nested setTimeout chains
3. Use proper lifecycle hooks

### Phase 5: Testing
1. Write Playwright tests for critical flows
2. Test all features to ensure nothing breaks

