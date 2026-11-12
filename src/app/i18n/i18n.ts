import { Injectable, computed, effect, signal } from '@angular/core';
import { EN } from './en';
import { PT } from './pt';
import { Texts } from './texts';

export type Lang = 'pt' | 'en';

export const LANGUAGES: { code: Lang; short: string; name: string; htmlLang: string }[] = [
  { code: 'pt', short: 'PT', name: 'Português', htmlLang: 'pt-BR' },
  { code: 'en', short: 'EN', name: 'English', htmlLang: 'en' },
];

export const DICTIONARIES: Record<Lang, Texts> = { pt: PT, en: EN };

const STORAGE_KEY = 'lang';

const isLang = (value: unknown): value is Lang => value === 'pt' || value === 'en';

/** ?lang= na URL → escolha salva → idioma preferido do navegador (pt* → pt, senão en). */
function detectLang(): Lang {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLang(fromUrl)) return fromUrl;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLang(saved)) return saved;
  } catch {
    // Armazenamento bloqueado (modo privado etc.): segue a detecção.
  }
  const preferred = navigator.languages?.[0] ?? navigator.language ?? '';
  return preferred.toLowerCase().startsWith('pt') ? 'pt' : 'en';
}

@Injectable({ providedIn: 'root' })
export class I18n {
  readonly lang = signal<Lang>(detectLang());
  readonly t = computed(() => DICTIONARIES[this.lang()]);

  constructor() {
    effect(() => {
      const lang = this.lang();
      const t = this.t();
      document.documentElement.lang = LANGUAGES.find((l) => l.code === lang)!.htmlLang;
      document.title = t.meta.title;
      document.querySelector('meta[name="description"]')?.setAttribute('content', t.meta.description);
    });
  }

  /** Troca o idioma e lembra a escolha (só escolhas explícitas são salvas). */
  setLang(lang: Lang): void {
    this.lang.set(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Sem armazenamento: vale só para esta visita.
    }
  }
}
