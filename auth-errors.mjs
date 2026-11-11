/** Fixed messages only: never expose raw responses, tokens or account existence. */
export function firebaseSignInError(code='') {
  const name=String(code).split(' : ')[0];
  if(['INVALID_LOGIN_CREDENTIALS','INVALID_PASSWORD','EMAIL_NOT_FOUND','USER_DISABLED'].includes(name))return 'Firebase could not sign you in. Check the email and password of your Firebase Authentication test account, or ask its administrator to check the account.';
  if(name==='OPERATION_NOT_ALLOWED'||name==='PASSWORD_LOGIN_DISABLED')return 'Email/password sign-in is disabled. Enable it in Firebase Authentication → Sign-in method.';
  if(name==='TOO_MANY_ATTEMPTS_TRY_LATER')return 'Firebase temporarily limited sign-in attempts. Wait before trying again.';
  if(['API_KEY_INVALID','API_KEY_SERVICE_BLOCKED','API_KEY_HTTP_REFERRER_BLOCKED','PERMISSION_DENIED'].includes(name))return 'Firebase configuration blocked this request. Check the Web API key, API restrictions and allowed website referrers.';
  if(name==='CONFIGURATION_NOT_FOUND'||name==='PROJECT_NOT_FOUND')return 'Firebase Authentication configuration was not found. Check the project and Web API key.';
  if(name==='INVALID_EMAIL'||name==='MISSING_EMAIL'||name==='MISSING_PASSWORD')return 'Enter a valid email and password for your Firebase test account.';
  return 'Firebase sign-in failed. Check Authentication setup and the test account, then try again.';
}
