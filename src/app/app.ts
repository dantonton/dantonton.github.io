import {
  Component,
  ElementRef,
  Injector,
  afterNextRender,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { CODING_SINCE, PORTFOLIO, SERVICES, SOCIAL_LINKS } from './data/content';
import { Lightbox, LightboxData } from './lightbox/lightbox';
import { PortfolioCarousel } from './portfolio-carousel/portfolio-carousel';
import { ProfilePanel } from './profile-panel/profile-panel';
import { ServicesPanel } from './services-panel/services-panel';

export type Section = 'none' | 'profile' | 'services' | 'portfolio';
type OpenSection = Exclude<Section, 'none'>;

/** Links diretos: #perfil, #servicos/2, #portfolio/3 … */
const HASHES: Record<OpenSection, string> = {
  profile: 'perfil',
  services: 'servicos',
  portfolio: 'portfolio',
};

@Component({
  selector: 'app-root',
  imports: [ProfilePanel, ServicesPanel, PortfolioCarousel, Lightbox],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: {
    '(document:keydown.escape)': 'onEscape()',
    '(window:hashchange)': 'readHash()',
  },
})
export class App {
  protected readonly socialLinks = SOCIAL_LINKS;
  protected readonly services = SERVICES;
  protected readonly portfolio = PORTFOLIO;
  protected readonly year = new Date().getFullYear();
  protected readonly yearsCoding = this.year - CODING_SINCE;

  protected readonly section = signal<Section>('none');
  protected readonly activeService = signal<number | null>(null);
  protected readonly activeCard = signal<number | null>(null);
  protected readonly lightbox = signal<LightboxData | null>(null);

  private readonly injector = inject(Injector);
  private readonly profileTab = viewChild.required<ElementRef<HTMLElement>>('profileTab');

  constructor() {
    this.readHash();
    effect(() => this.writeHash());
  }

  /** Abre a seção, ou fecha tudo se ela já estiver aberta. */
  protected toggle(section: OpenSection): void {
    if (this.section() === section) {
      this.reset();
      return;
    }
    this.activeService.set(null);
    this.activeCard.set(null);
    this.section.set(section);

    if (section === 'profile') {
      // O botão que abriu o perfil some; o foco vai para o "fechar".
      this.afterRender(() =>
        this.profileTab().nativeElement.querySelector<HTMLElement>('.close')?.focus({ preventScroll: true }),
      );
    }
  }

  /** Volta tudo ao estado inicial. As transições CSS fazem a animação reversa. */
  protected reset(): void {
    const tab = this.profileTab().nativeElement;
    const focusWasInProfile = tab.contains(document.activeElement);

    this.lightbox.set(null);
    this.activeService.set(null);
    this.activeCard.set(null);
    this.section.set('none');

    if (focusWasInProfile) {
      this.afterRender(() => tab.querySelector<HTMLElement>('.tab__hit')?.focus({ preventScroll: true }));
    }
  }

  /** Clique fora de qualquer área interativa (marcada com data-inside) fecha tudo. */
  protected onStageClick(event: MouseEvent): void {
    const target = event.target as Element | null;
    if (target?.closest('[data-inside]')) return;
    if (this.section() !== 'none') this.reset();
  }

  /** Esc fecha um nível por vez: lightbox → card → serviço → seção. */
  protected onEscape(): void {
    if (this.lightbox()) this.lightbox.set(null);
    else if (this.activeCard() !== null) this.activeCard.set(null);
    else if (this.activeService() !== null) this.activeService.set(null);
    else if (this.section() !== 'none') this.reset();
  }

  protected selectService(index: number): void {
    this.activeService.update((current) => (current === index ? null : index));
  }

  protected readHash(): void {
    const [name, sub] = decodeURIComponent(location.hash.slice(1)).split('/');
    const entry = Object.entries(HASHES).find(([, hash]) => hash === name);
    const section = (entry?.[0] as OpenSection | undefined) ?? 'none';
    const index = Number(sub) - 1;

    this.lightbox.set(null);
    this.section.set(section);
    this.activeService.set(
      section === 'services' && index >= 0 && index < this.services.length ? index : null,
    );
    this.activeCard.set(
      section === 'portfolio' && index >= 0 && index < this.portfolio.length ? index : null,
    );
  }

  private writeHash(): void {
    const section = this.section();
    let hash = '';
    if (section !== 'none') {
      const sub =
        section === 'services'
          ? this.activeService()
          : section === 'portfolio'
            ? this.activeCard()
            : null;
      hash = `#${HASHES[section]}${sub !== null ? `/${sub + 1}` : ''}`;
    }
    if (hash !== location.hash) {
      history.replaceState(history.state, '', `${location.pathname}${location.search}${hash}`);
    }
  }

  private afterRender(fn: () => void): void {
    afterNextRender(fn, { injector: this.injector });
  }
}
