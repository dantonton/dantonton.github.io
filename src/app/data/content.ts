/** Conteúdo do site. Os textos ficam aqui para que o template trate só de layout. */

export const CONTACT_EMAIL = 'dantonmoura@hotmail.com';

/** Ano em que comecei a programar profissionalmente. */
export const CODING_SINCE = 2011;

export interface SocialLink {
  label: string;
  href: string;
  /** Path de 24×24 (Material Design Icons). */
  icon: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
  {
    label: 'GitHub',
    href: 'https://github.com/dantonton',
    icon: 'M12,2A10,10 0 0,0 2,12C2,16.42 4.87,20.17 8.84,21.5C9.34,21.58 9.5,21.27 9.5,21C9.5,20.77 9.5,20.14 9.5,19.31C6.73,19.91 6.14,17.97 6.14,17.97C5.68,16.81 5.03,16.5 5.03,16.5C4.12,15.88 5.1,15.9 5.1,15.9C6.1,15.97 6.63,16.93 6.63,16.93C7.5,18.45 8.97,18 9.54,17.76C9.63,17.11 9.89,16.67 10.17,16.42C7.95,16.17 5.62,15.31 5.62,11.5C5.62,10.39 6,9.5 6.65,8.79C6.55,8.54 6.2,7.5 6.75,6.15C6.75,6.15 7.59,5.88 9.5,7.17C10.29,6.95 11.15,6.84 12,6.84C12.85,6.84 13.71,6.95 14.5,7.17C16.41,5.88 17.25,6.15 17.25,6.15C17.8,7.5 17.45,8.54 17.35,8.79C18,9.5 18.38,10.39 18.38,11.5C18.38,15.32 16.04,16.16 13.81,16.41C14.17,16.72 14.5,17.33 14.5,18.26C14.5,19.6 14.5,20.68 14.5,21C14.5,21.27 14.66,21.59 15.17,21.5C19.14,20.16 22,16.42 22,12A10,10 0 0,0 12,2Z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/danton-moura-8643106/',
    icon: 'M21,21H17V14.25C17,13.19 15.81,12.31 14.75,12.31C13.69,12.31 13,13.19 13,14.25V21H9V9H13V11C13.66,9.93 15.36,9.24 16.5,9.24C19,9.24 21,11.28 21,13.75V21M7,21H3V9H7V21M5,3A2,2 0 0,1 7,5A2,2 0 0,1 5,7A2,2 0 0,1 3,5A2,2 0 0,1 5,3Z',
  },
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/dantonton',
    icon: 'M17,2V2H17V6H15C14.31,6 14,6.81 14,7.5V10H14L17,10V14H14V22H10V14H7V10H10V6A4,4 0 0,1 14,2H17Z',
  },
  {
    label: 'E-mail',
    href: `mailto:${CONTACT_EMAIL}`,
    icon: 'M20,8L12,13L4,8V6L12,11L20,6M20,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V6C22,4.89 21.1,4 20,4Z',
  },
];

export interface Skill {
  name: string;
  /** 0–100 */
  level: number;
}

export const SKILLS: Skill[] = [
  { name: 'C# .NET', level: 100 },
  { name: 'JavaScript', level: 100 },
  { name: 'Ionic', level: 87 },
  { name: 'React', level: 67 },
  { name: 'Angular', level: 87 },
  { name: 'SQL', level: 67 },
  { name: 'CSS/SCSS', level: 100 },
  { name: 'RFID', level: 50 },
];

export interface Service {
  id: string;
  title: string;
  /** Parágrafos (podem conter HTML simples: <strong>, <em>, <a>). */
  paragraphs: string[];
  bullets?: string[];
  image?: { src: string; alt: string };
}

export const SERVICES: Service[] = [
  {
    id: 'mvp',
    title: 'Produto Mínimo Viável (MVP)',
    paragraphs: [
      '<strong>Eric Ries</strong>, no livro <a href="https://pt.wikipedia.org/wiki/Lean_startup" target="_blank" rel="noopener noreferrer"><em>A Startup Enxuta</em></a>, apresenta um conceito muito útil para quem tem uma ideia de negócio ou de melhoria de processo.',
      'Muitas vezes, quando surge uma ideia, o empreendedor tenta implementá-la com todos os recursos e com uma perfeição que inviabiliza o próprio projeto. Na pior das hipóteses, a ideia é implementada, mas não tem a adesão esperada e gera prejuízo.',
    ],
    bullets: [
      'Mentoria para encontrarmos juntos uma solução enxuta e viável.',
      'Desenvolvimento da solução e condução da melhor implementação possível.',
      'Evolução contínua até um software completo, que atenda a todas as necessidades.',
    ],
  },
  {
    id: 'rfid',
    title: 'Middleware RFID',
    paragraphs: [
      'Um mediador entre os equipamentos receptores de sinal RFID e o software final.',
      'O middleware é mantido por mim e serve de apoio para empresas que querem abstrair a parte de RFID dos seus sistemas.',
    ],
    image: {
      src: 'assets/services/rfid-middleware.webp',
      alt: 'Diagrama: antenas RFID no caixa e no estoque ligadas a um leitor RFID, que se conecta ao computador pela rede',
    },
  },
  {
    id: 'totem',
    title: 'Totem de Autoatendimento',
    paragraphs: [
      'Desenvolvi um software que gerencia uma cabine fotográfica para eventos como casamentos, aniversários e eventos corporativos.',
      'Também tenho outros totens de autoatendimento que facilitam o dia a dia do comércio.',
    ],
  },
];

export interface PortfolioImage {
  src: string;
  thumb: string;
}

export interface PortfolioItem {
  title: string;
  summary: string;
  tags: string[];
  /** Telas de celular (retrato) são exibidas lado a lado no card. */
  mobile?: boolean;
  images: PortfolioImage[];
}

const img = (name: string): PortfolioImage => ({
  src: `assets/portfolio/${name}.webp`,
  thumb: `assets/portfolio/${name}-thumb.webp`,
});

export const PORTFOLIO: PortfolioItem[] = [
  {
    title: 'Ambev',
    summary:
      'Gerenciamento de questionários para pesquisas de opinião. Arquitetei o projeto para permitir diversos tipos de perguntas, tudo de forma genérica e orientada a objetos.',
    tags: ['Arquitetura', 'Web'],
    images: [img('ambev')],
  },
  {
    title: 'White Martins',
    summary:
      'Ferramenta do grupo White Martins para calcular orçamentos. Atuei na manutenção do software e na construção de um ambiente de entrega contínua, com um código manutenível.',
    tags: ['Manutenção', 'Entrega contínua'],
    images: [img('white-martins')],
  },
  {
    title: 'FAPES e NIADES',
    summary:
      'Arquitetei um sistema web SaaS para diversos comitês de bacias hidrográficas.',
    tags: ['SaaS', 'Arquitetura'],
    images: [img('fapes')],
  },
  {
    title: 'Unimed',
    summary:
      'Desenvolvimento de aplicativo híbrido para a Unimed, seguindo com precisão a especificação de design.',
    tags: ['App híbrido', 'Mobile'],
    mobile: true,
    images: [img('unimed-1'), img('unimed-2'), img('unimed-3')],
  },
  {
    title: 'MDK Exames',
    summary: 'Aplicativo de web scraping de exames laboratoriais.',
    tags: ['Web scraping', 'Mobile'],
    mobile: true,
    images: [img('mdk-1'), img('mdk-2')],
  },
  {
    title: 'Solverup',
    summary: 'Criação do site da Solverup, com sistema de registro de demandas.',
    tags: ['Website'],
    images: [img('solverup')],
  },
  {
    title: 'SelfStyle',
    summary: 'Criação e design do site da SelfStyle.',
    tags: ['Website', 'Design'],
    images: [img('selfstyle')],
  },
];
