import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChildren,
} from '@angular/core';
import { Service } from '../data/content';
import { LightboxData } from '../lightbox/lightbox';

/**
 * As "gotas" de Serviços. Elas caem da aba, viram botões e, ao clicar, abrem
 * como acordeão. Todo o movimento é feito com transições CSS (ida e volta).
 */
@Component({
  selector: 'app-services-panel',
  templateUrl: './services-panel.html',
  styleUrl: './services-panel.scss',
  host: {
    '[class.is-open]': 'open()',
    '[class.is-settled]': 'settled()',
    '[style.--n]': 'items().length',
    '[style.--active-inner-h]': 'activeInnerHeight()',
    '[attr.inert]': 'open() ? null : ""',
  },
})
export class ServicesPanel {
  readonly open = input(false);
  readonly items = input.required<Service[]>();
  readonly active = input<number | null>(null);

  readonly selectItem = output<number>();
  readonly openImage = output<LightboxData>();

  /**
   * Depois da animação de entrada, as transições ficam rápidas e sem atraso
   * para abrir e fechar os itens.
   */
  protected readonly settled = signal(false);

  /** Altura natural do conteúdo de cada item: o item aberto não fica maior que o texto. */
  protected readonly innerHeights = signal<number[]>([]);
  protected readonly activeInnerHeight = computed(() => {
    const active = this.active();
    const height = active === null ? undefined : this.innerHeights()[active];
    return height === undefined ? null : `${height}px`;
  });

  private readonly inners = viewChildren<ElementRef<HTMLElement>>('inner');

  constructor() {
    effect((onCleanup) => {
      if (!this.open()) {
        this.settled.set(false);
        return;
      }
      const timer = setTimeout(() => this.settled.set(true), 1000);
      onCleanup(() => clearTimeout(timer));
    });

    // Remede quando fontes carregam ou a largura da tela muda.
    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const observer = new ResizeObserver(() =>
        this.innerHeights.set(this.inners().map(({ nativeElement }) => Math.ceil(nativeElement.offsetHeight))),
      );
      this.inners().forEach(({ nativeElement }) => observer.observe(nativeElement));
      destroyRef.onDestroy(() => observer.disconnect());
    });
  }

  protected innerHeight(index: number): string | null {
    const height = this.innerHeights()[index];
    return height === undefined ? null : `${height}px`;
  }

  protected select(index: number): void {
    this.settled.set(true);
    this.selectItem.emit(index);
  }

  protected zoom(service: Service): void {
    if (!service.image) return;
    this.openImage.emit({ images: [service.image.src], index: 0, title: service.title });
  }
}
