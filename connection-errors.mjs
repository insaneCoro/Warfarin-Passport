// Map only recognized errors; never reflect upstream HTML, credentials or raw exceptions.
export function backendErrorCode(message='') {
 const known={
  'Server signing key is missing':'BACKEND_SECRET_MISSING',
  'Unauthorized request':'SIGNING_KEY_MISMATCH',
  'Request expired':'SIGNED_REQUEST_EXPIRED',
  'User is not approved':'STAFF_NOT_APPROVED',
  'User email mismatch':'STAFF_EMAIL_MISMATCH',
  'Duplicate request':'SIGNED_REQUEST_REPLAY',
  'Request rejected; verify session and configuration':'GATEWAY_REJECTED'
 };
 if(known[message])return known[message];
 if(String(message).startsWith('Schema migration required:')||String(message).startsWith('Missing database tab:'))return 'DATABASE_MIGRATION_REQUIRED';
 if(String(message).startsWith('DATABASE_ID is not configured.'))return 'DATABASE_NOT_CONFIGURED';
 return 'API_REJECTED';
}
const messages={
 BACKEND_SECRET_MISSING:'Apps Script is missing a signing secret of at least 32 characters.',
 SIGNING_KEY_MISMATCH:'The signing secrets in Cloudflare and Apps Script do not match. Replace both with the same value.',
 SIGNED_REQUEST_EXPIRED:'Apps Script rejected the signed request timestamp. Check the deployed Worker version.',
 STAFF_NOT_APPROVED:'Your Firebase user is not approved in the Users tab. Check firebaseUid, active=true and the staff role.',
 STAFF_EMAIL_MISMATCH:'The Users tab email does not match your Firebase account email.',
 DATABASE_MIGRATION_REQUIRED:'The database schema needs migration. Run migrateDatabase in the deployed Apps Script project.',
 DATABASE_NOT_CONFIGURED:'The deployed Apps Script project has no DATABASE_ID configured.',
 GATEWAY_PROJECT_MISSING:'Cloudflare is missing FIREBASE_PROJECT_ID.',
 GATEWAY_SECRET_MISSING:'Cloudflare is missing a GATEWAY_HMAC_SECRET of at least 32 characters.',
 GATEWAY_URL_INVALID:'Cloudflare APPS_SCRIPT_URL must be the Apps Script Web App URL ending in /exec.',
 AUTH_TOKEN_INVALID:'The Worker could not verify the Firebase token. Check FIREBASE_PROJECT_ID and the deployed Worker.',
 AUTH_TOKEN_MISSING:'The request did not include its Firebase token. Sign in again.',
 BACKEND_UNREACHABLE:'The Worker could not reach Apps Script. Check its Web App URL and deployment access.',
 BACKEND_RESPONSE_INVALID:'Apps Script returned an unexpected response. Check Web App access is Anyone and Execute as Me.',
 BACKEND_HTTP_ERROR:'Apps Script returned an HTTP error. Check the deployment URL and access settings.',
 GATEWAY_NETWORK:'The browser could not read the API response. Check Worker availability and ALLOWED_ORIGIN.',
 GATEWAY_REJECTED:'The Worker rejected the request without a detailed error. Deploy the latest gateway code and check its runtime settings.'
};
export function connectionErrorMessage(code){return `Firebase sign-in succeeded. ${messages[code]||'The clinic API rejected the request; check the backend deployment.'} [${Object.hasOwn(messages,code)?code:'API_REJECTED'}]`;}
export function safeConnectionCode(code){return Object.hasOwn(messages,code)?code:null;}
