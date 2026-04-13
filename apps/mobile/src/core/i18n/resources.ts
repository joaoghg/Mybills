import { enUS } from './locales/en-US';
import { ptBR } from './locales/pt-BR';

export const defaultLanguage = 'pt-BR';

export const resources = {
  'en-US': {
    translation: enUS
  },
  'pt-BR': {
    translation: ptBR
  }
} as const;

export type AppLanguage = keyof typeof resources;
