// ============================================================
// Pathly i18n: Language Context + useTranslation hook
// Reads/writes the same localStorage key ('ner_language') that
// App already uses, so the selected language persists across
// navigation within a session.
// ============================================================

import React, { createContext, useContext } from 'react';
import {
  translate,
  type Language,
} from './translations';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function LanguageProvider({
  language,
  children,
}: {
  language: string;
  children: React.ReactNode;
}) {
  const normalized: Language = (['en', 'hi', 'as', 'bn', 'mni'].includes(language) ? language : 'en') as Language;

  const t = (key: string) => translate(normalized, key);

  const value: LanguageContextValue = {
    language: normalized,
    setLanguage: () => {},
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
