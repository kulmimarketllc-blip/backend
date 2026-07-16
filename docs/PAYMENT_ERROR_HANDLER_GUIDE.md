# Payment Error Handling - Quick Reference Guide

## For Developers

### 1. Handling Payment Errors in Components

#### Basic Payment Error Handling:
```javascript
import { handlePaymentError } from '../utils/paymentErrorHandler';

try {
  // ... payment logic
} catch (error) {
  const userMessage = handlePaymentError(error);
  setError(userMessage); // Show to user
}
```

#### Stripe Confirmation Errors:
```javascript
import { handleStripeConfirmationError } from '../utils/paymentErrorHandler';

const confirmation = await stripe.confirmCardPayment(clientSecret, { ... });
if (confirmation.error) {
  const message = handleStripeConfirmationError(confirmation);
  setError(message); // Show user-friendly message
}
```

### 2. API Error Handling (Already Protected)

The `apiExecutor.js` automatically filters sensitive data, so you don't need to do anything special:

```javascript
// In your Redux thunk - apiExecutor handles filtering automatically
const result = await apiExecutor(apiCall, rejectWithValue, signal);
// - Full errors only logged in development
// - Sensitive fields filtered automatically
// - Redux state is safe
```

### 3. Generic Error Handling

For non-payment API errors, use `handleApiError()`:

```javascript
import { handleApiError } from '../utils/errorHandler';

try {
  // ... API call
} catch (error) {
  const message = handleApiError(error);
  setError(message);
}
```

### 4. Environment-Aware Logging

Only log detailed information in development:

```javascript
// Won't log anything in production
if (import.meta.env.DEV) {
  console.error('Full error details:', error);
}

// Or use helper in apiExecutor
devLog('error', 'Message', data); // Only logs in dev
```

---

## Error Message Mapping

### Common Stripe Errors → User Messages:

| Stripe Error | User Message |
|-------------|--------------|
| `card_declined` | "Your card was declined. Please try a different payment method." |
| `card_error` | "There was an issue with your card. Please check the details and try again." |
| `expired_card` | "Your card has expired. Please use a different card." |
| `incorrect_cvc` | "The CVC code is incorrect. Please check and try again." |
| `authentication_failed` | "Payment authentication failed. Please try again with a different card." |
| `insufficient_funds` | "Insufficient funds. Please check your account balance and try again." |
| `rate_limit` | "Too many requests. Please wait a moment and try again." |

### API Errors → User Messages:

| API Status | User Message |
|-----------|--------------|
| `401/403` | "You do not have permission to perform this action." |
| `404` | "The requested resource was not found." |
| `500+` | "Server error. Please try again later." |
| Network Error | "Network error. Please check your connection and try again." |

---

## Testing Your Implementation

### 1. Check for Sensitive Data Leaks

**In Development Console:**
```javascript
// ✅ GOOD - Shows detailed logs
import.meta.env.DEV // true in development
// Should see full error messages

// ✅ GOOD - Check Redux DevTools
// Error data should only have: {message, code, status}
// Should NOT have: stack traces, internal IDs, API keys
```

**In Production Console:**
```javascript
// ✅ GOOD - Silent logging
// No error details logged to console
// Only user-friendly messages shown

// ✅ GOOD - Redux DevTools
// Error data is minimal: {message, code, status}
// No sensitive information exposed
```

### 2. Test Payment Errors

```javascript
// Test declined card
// Expected: "Your card was declined. Please try a different payment method."
// NOT: "Card declined (code: card_declined)"

// Test network error
// Expected: "Network error. Please check your connection and try again."
// NOT: Full fetch error details

// Test Stripe initialization error
// Expected: "Payment system failed to initialize. Please reload the page and try again."
// NOT: "Stripe.js failed to load"
```

### 3. Verify Error Messages Don't Leak

**What users should NOT see:**
- ❌ Stripe error codes (card_declined, etc.)
- ❌ HTTP status codes (401, 403, 500, etc.)
- ❌ Stack traces
- ❌ Internal API paths
- ❌ Database errors
- ❌ API key hints

**What users SHOULD see:**
- ✅ Friendly, actionable messages
- ✅ Clear next steps
- ✅ No technical jargon
- ✅ Generic fallback for unknown errors

---

## Files to Review

1. **`/Screens/src/utils/paymentErrorHandler.js`** - Payment error mapping
2. **`/Screens/src/services/apiExecutor.js`** - Redux error filtering
3. **`/Screens/src/utils/errorHandler.js`** - Generic API error handler
4. **`/Screens/src/pages/public/public_Cart/CartView.jsx`** - Checkout implementation

---

## Common Questions

### Q: Where do I import the payment error handler?
**A:** From `../utils/paymentErrorHandler`:
```javascript
import { handlePaymentError, handleStripeConfirmationError } from '../utils/paymentErrorHandler';
```

### Q: Do I need to manually filter API errors?
**A:** No! The `apiExecutor.js` handles it automatically. Just use `handlePaymentError()` or `handleApiError()` to extract user-friendly messages.

### Q: How do I log errors in development only?
**A:** Use the `import.meta.env.DEV` check:
```javascript
if (import.meta.env.DEV) {
  console.error('Detailed error:', error);
}
```

### Q: Can users see raw error messages?
**A:** No. All error handlers sanitize messages and hide technical details before showing to users.

### Q: What if an error doesn't match any pattern?
**A:** Returns a generic fallback: "An unexpected error occurred. Please try again or contact support."

---

## Rollout Checklist

- [x] Payment error handler created
- [x] CartView.jsx updated to use handlers
- [x] apiExecutor.js updated with filtering
- [x] errorHandler.js updated with non-sensitive messages
- [ ] Test payment errors in development
- [ ] Test payment errors in staging
- [ ] Verify no console errors in production
- [ ] Review Redux DevTools for sensitive data
- [ ] Monitor error logs for patterns
- [ ] Update documentation for team

---

## Maintenance

### Adding New Error Types

Edit `/Screens/src/utils/paymentErrorHandler.js`:

```javascript
const PAYMENT_ERROR_MESSAGES = {
  'your_new_error': 'User-friendly message without technical details.',
  // ... other errors
};
```

Then update `getStandardErrorMessage()` keywords if needed:
```javascript
const keywords = [
  { key: 'your_keyword', msg: PAYMENT_ERROR_MESSAGES.your_new_error },
  // ... other keywords
];
```

### Monitoring

1. Check browser console in production (should be silent)
2. Monitor Redux DevTools for error patterns
3. Track which errors users encounter
4. Update messages based on user feedback

---

## References

- Stripe Error Codes: https://stripe.com/docs/error-codes
- NestJS Exceptions: https://docs.nestjs.com/exception-filters
- React Error Handling: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
