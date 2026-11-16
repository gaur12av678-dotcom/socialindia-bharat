# SocialIndia Server-Side Economy Functions (Cloud Functions Spec)

To enforce zero-trust and prevent clients from directly writing to sensitive economic parameters like `points` or `walletBalance`, all client mutations to these properties must be disabled. Instead, mutations must occur strictly via secure HTTPS Callable Cloud Functions or Firestore database triggers.

Below are the blueprints for the required serverless cloud functions:

## 1. `awardPoints` (Callable Cloud Function)
Awards points to a user for platform engagement (like uploading, liking, or watching videos) with per-user daily rate-limiting and anti-spam verification.

- **Trigger Type**: HTTPS Callable
- **Parameters**:
  - `videoId`: string (optional, context for why points are awarded)
  - `action`: `'watch' | 'like' | 'upload_short' | 'upload_video'`
- **Internal Server-Side Logic**:
  1. Validate caller authentication token (`context.auth`). If not signed in, reject.
  2. Read configuration parameters for active rates (e.g. 5 points for like, 10 points for watch).
  3. Query historical point transactions under `/users/{uid}/points_log` for the current calendar day to verify the user has not exceeded the maximum daily cap (e.g., max 100 points/day).
  4. Perform atomic update in Firestore using transaction:
     - Increment `users/{uid}/points` by the designated rate.
     - Append receipt entry inside `users/{uid}/points_log/{txId}`.

---

## 2. `convertPointsToWallet` (Callable Cloud Function)
Converts accumulated points balance to USD Wallet Balance at the strict platform exchange rate of 100 points = $1.00 USD ($0.01 per point).

- **Trigger Type**: HTTPS Callable
- **Parameters**:
  - `pointsToConvert`: number (must be multiple of 100, min 100)
- **Internal Server-Side Logic**:
  1. Authenticate context. Read `context.auth.uid`.
  2. Execute atomic Firestore transaction on user profile document `/users/{uid}`:
     - Fetch current user document and verify `points >= pointsToConvert`.
     - Verify `pointsToConvert >= 100` and is positive.
     - Calculate USD equivalent: `usdAmount = pointsToConvert * 0.01`.
     - Subtract `pointsToConvert` from `points`.
     - Add `usdAmount` to `walletBalance`.
     - Write transactional receipt to `/users/{uid}/ledger/{txId}` with timestamp, type `'conversion'`, amount `usdAmount`, and points `-pointsToConvert`.

---

## 3. `payoutRequest` (Callable Cloud Function)
Registers a request to withdraw active USD Wallet Balance funds to a PayPal or Bank Account, deducting balance at registration time and putting it into a secure escrow state.

- **Trigger Type**: HTTPS Callable
- **Parameters**:
  - `amount`: number (must be positive, min $10.00)
  - `payoutMethod`: `'paypal'`
  - `email`: string (valid PayPal email target)
- **Internal Server-Side Logic**:
  1. Authenticate caller.
  2. Execute Firestore transaction:
     - Fetch user document `/users/{uid}` and verify `walletBalance >= amount`.
     - Verify `amount >= 10.00` (platform minimum payout threshold).
     - Subtract `amount` from `walletBalance`.
     - Write a new request document inside `/payout_requests/{requestId}` with status `'pending'`, user info, amount, method, and transaction receipt.

---

### Security Rule Guard Enforcement:
Ensure client-side write access to `points` and `walletBalance` is strictly disabled by enforcing `!(request.resource.data.keys().hasAny(['points', 'walletBalance']))` inside `firestore.rules`.

## Grievance Email Delivery (Not Configured)

The current application stores grievance submissions in Firestore but has no email provider or server-side email function configured. It does not send acknowledgement emails. The administrator's response action opens an email application and also does not send automatically.

To enable real email delivery:

1. Select an email provider and verify `socialindia.ib@gmail.com` (or its sending domain) with that provider. Configure the provider's recommended SPF/DKIM records before sending production email.
2. Deploy a trusted Firebase server-side function. Add a Firestore `onCreate` handler for `grievances/{grievanceId}` to send a receipt containing the stored tracking ID, category, and support contact. Do not send sensitive complaint details in the acknowledgement.
3. Add an authenticated administrator response function. Verify administrator authorization on the server for every call; never accept an admin role, complaint status, or recipient address as trusted client input.
4. Store the provider API key or SMTP credentials in Firebase/Google Secret Manager and bind the secret only to the sending function. Never add credentials to Vite client environment variables, Firestore documents, or source control.
5. Record delivery state/error metadata server-side and update the UI to report delivery only after the provider confirms acceptance. Keep the current "not sent" messaging until this is deployed and tested.

No email credentials or provider settings are present in this repository. Email delivery must remain disabled until these steps are completed.
