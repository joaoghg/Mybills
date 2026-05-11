export const auth = {
  title: 'MyBills',
  subtitle: 'Sign in or create an account to keep your finances organized.',
  loginTab: 'Login',
  signupTab: 'Sign up',
  nameLabel: 'Name',
  namePlaceholder: 'Your name',
  emailLabel: 'Email',
  emailPlaceholder: 'you@example.com',
  passwordLabel: 'Password',
  passwordPlaceholder: 'Enter your password',
  confirmPasswordLabel: 'Confirm password',
  confirmPasswordPlaceholder: 'Repeat your password',
  passwordRulesHint:
    'Use at least 8 characters, including uppercase, lowercase, and a number.',
  validation: {
    nameRequired: 'Please enter your name.',
    emailInvalid: 'Enter a valid email address.',
    passwordRequirements:
      'Password must be at least 8 characters and include uppercase, lowercase, and a number.'
  },
  loginAction: 'Sign in',
  signupAction: 'Create account',
  or: 'or',
  googleButton: 'Continue with Google',
  languageLabel: 'Language',
  languagePtBR: 'PT-BR',
  languageUS: 'US',
  switchToSignup: "Don't have an account yet? Create one",
  switchToLogin: 'I already have an account',
  signupLoading: 'Creating account…',
  loginLoading: 'Signing in…',
  errors: {
    network: 'No connection. Check your network and try again.',
    emailTaken: 'This email is already registered.',
    validation: 'Check your details and try again.',
    generic: 'Could not complete sign-up. Please try again.',
    signInGeneric: 'Could not sign in. Please try again.',
    invalidCredentials: 'Invalid email or password.',
    passwordMismatch: 'Passwords do not match.'
  }
} as const;
