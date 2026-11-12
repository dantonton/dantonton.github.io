import { ProjectData, ProjectId, ServiceData, ServiceId } from '../data/content';

export interface ServiceTexts {
  title: string;
  /** Parágrafos (podem conter HTML simples: <strong>, <em>, <a>). */
  paragraphs: string[];
  bullets?: string[];
  imageAlt?: string;
}

export interface ProjectTexts {
  title: string;
  summary: string;
  tags: string[];
}

/** Item de serviço já com os textos do idioma atual. */
export type Service = ServiceData & ServiceTexts;
/** Projeto do portfólio já com os textos do idioma atual. */
export type PortfolioItem = ProjectData & ProjectTexts;

/** Contrato dos dicionários: pt.ts e en.ts precisam ter tudo isto. */
export interface Texts {
  meta: { title: string; description: string };
  /** Nomes usados nos links diretos (#perfil, #profile…). */
  hashes: { profile: string; services: string; portfolio: string };
  language: string;
  brand: { role: string; home: string };
  tabs: {
    profile: string;
    portfolio: string;
    services: string;
    openProfile: string;
    closeProfile: string;
  };
  social: string;
  profile: {
    hello: string;
    about: (yearsCoding: number) => string;
    invite: string;
    cta: string;
    skills: string;
    skillColumn: string;
    levelColumn: string;
  };
  services: Record<ServiceId, ServiceTexts>;
  enlargeImage: string;
  projects: Record<ProjectId, ProjectTexts>;
  portfolio: {
    enlarge: (image: number, title: string) => string;
    categories: string;
    previous: string;
    next: string;
  };
  lightbox: {
    close: string;
    previous: string;
    next: string;
    imageOf: (title: string, image: number, total: number) => string;
  };
}
