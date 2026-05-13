export const auth = {
  title: 'MyBills',
  subtitle: 'Entre ou crie sua conta para continuar organizando suas finanças.',
  loginTab: 'Login',
  signupTab: 'Cadastro',
  nameLabel: 'Nome',
  namePlaceholder: 'Seu nome',
  emailLabel: 'E-mail',
  emailPlaceholder: 'voce@exemplo.com',
  passwordLabel: 'Senha',
  passwordPlaceholder: 'Digite sua senha',
  confirmPasswordLabel: 'Confirmar senha',
  confirmPasswordPlaceholder: 'Repita sua senha',
  passwordRulesHint:
    'Use pelo menos 8 caracteres, com letra maiúscula, minúscula e um número.',
  validation: {
    nameRequired: 'Informe seu nome.',
    emailInvalid: 'Digite um e-mail válido.',
    passwordRequirements:
      'A senha deve ter pelo menos 8 caracteres e incluir maiúscula, minúscula e um número.'
  },
  loginAction: 'Entrar',
  signupAction: 'Criar conta',
  or: 'ou',
  googleButton: 'Continuar com Google',
  switchToSignup: 'Ainda não tem conta? Criar cadastro',
  switchToLogin: 'Já tenho conta',
  signupLoading: 'Criando conta…',
  loginLoading: 'Entrando…',
  errors: {
    network: 'Sem conexão. Verifique a internet e tente de novo.',
    emailTaken: 'Este e-mail já está cadastrado.',
    validation: 'Confira os dados e tente de novo.',
    generic: 'Não foi possível concluir o cadastro. Tente novamente.',
    signInGeneric: 'Não foi possível entrar. Tente novamente.',
    invalidCredentials: 'E-mail ou senha inválidos.',
    passwordMismatch: 'As senhas não coincidem.'
  }
} as const;
