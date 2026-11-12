import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
  viewChild,
  viewChildren,
} from '@angular/core';
import { I18n } from '../i18n/i18n';
import { PortfolioItem } from '../i18n/texts';
import { LightboxData } from '../lightbox/lightbox';

const DRAG_THRESHOLD = 6;
const WHEEL_STEP = 40;
const WHEEL_LOCK_MS = 380;
const SETTLE_MS = 140;

const prefersReducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Carrossel do portfólio: todos os cards lado a lado, com scroll-snap.
 * Touch usa o swipe nativo. Mouse: arrastar, roda e botões ‹ ›. Teclado: setas.
 */
@Component({
  selector: 'app-portfolio-carousel',
  templateUrl: './portfolio-carousel.html',
  styleUrl: './portfolio-carousel.scss',
  host: {
    '[class.is-open]': 'open()',
    '[class.is-settled]': 'settled()',
    '[class.has-active]': 'active() !== null',
    '[style.--n]': 'items().length',
    '[attr.inert]': 'open() ? null : ""',
    '(keydown)': 'onKeydown($event)',
  },
})
export class PortfolioCarousel {
  readonly open = input(false);
  readonly items = input.required<PortfolioItem[]>();
  readonly active = input<number | null>(null);

  protected readonly t = inject(I18n).t;

  readonly activate = output<number | null>();
  readonly openImage = output<LightboxData>();

  protected readonly settled = signal(false);
  protected readonly current = signal(0);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly track = viewChild.required<ElementRef<HTMLElement>>('track');
  /** Slots sem transform: usados para medir posições e para o scroll-snap. */
  private readonly slots = viewChildren<ElementRef<HTMLElement>>('slot');

  private drag: { x: number; scroll: number; moved: boolean } | null = null;
  private suppressClick = false;
  private wheelAcc = 0;
  private wheelLockUntil = 0;
  private settleTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    // Entrada em cascata e, depois dela, transições rápidas (sem atrasos).
    effect((onCleanup) => {
      if (!this.open()) {
        this.settled.set(false);
        return;
      }
      const timer = setTimeout(() => this.settled.set(true), 900);
      onCleanup(() => clearTimeout(timer));
    });

    // Card ativado → centraliza. Fechou → volta o scroll para o início.
    afterRenderEffect(() => {
      const open = this.open();
      const active = this.active();
      untracked(() => {
        if (!open) this.scrollToIndex(0);
        else if (active !== null) this.scrollToIndex(active);
      });
    });

    afterNextRender(() => {
      const track = this.track().nativeElement;
      track.addEventListener('scroll', this.onScroll, { passive: true });
      track.addEventListener('wheel', this.onWheel, { passive: false });
      // Captura: depois de arrastar, o clique não ativa card nem fecha a seção.
      this.host.addEventListener('click', this.onClickCapture, true);
    });

    inject(DestroyRef).onDestroy(() => {
      this.stopDrag();
      clearTimeout(this.settleTimer);
      this.host.removeEventListener('click', this.onClickCapture, true);
    });
  }

  protected onCardClick(index: number): void {
    this.settled.set(true);
    this.activate.emit(this.active() === index ? null : index);
  }

  protected onImageClick(index: number, imageIndex: number, event: Event): void {
    event.stopPropagation();
    const item = this.items()[index];
    this.settled.set(true);
    if (this.active() !== index) this.activate.emit(index);
    this.openImage.emit({
      images: item.images.map((image) => image.src),
      index: imageIndex,
      title: item.title,
    });
  }

  protected step(direction: number): void {
    const last = this.items().length - 1;
    const target = Math.min(last, Math.max(0, this.current() + direction));
    this.scrollToIndex(target);
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      this.step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  }

  protected onPointerDown(event: PointerEvent): void {
    if (event.pointerType !== 'mouse' || event.button !== 0) return;
    this.drag = { x: event.clientX, scroll: this.track().nativeElement.scrollLeft, moved: false };
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);
    window.addEventListener('pointercancel', this.onPointerUp);
  }

  private readonly onPointerMove = (event: PointerEvent) => {
    if (!this.drag) return;
    const track = this.track().nativeElement;
    const dx = event.clientX - this.drag.x;
    if (!this.drag.moved && Math.abs(dx) > DRAG_THRESHOLD) {
      this.drag.moved = true;
      track.classList.add('is-dragging');
      window.getSelection()?.removeAllRanges();
    }
    if (this.drag.moved) track.scrollLeft = this.drag.scroll - dx;
  };

  private readonly onPointerUp = () => {
    const moved = this.drag?.moved;
    this.stopDrag();
    if (!moved) return;
    this.track().nativeElement.classList.remove('is-dragging');
    // O clique é disparado logo após o pointerup, ainda nesta mesma tarefa.
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false));
    this.scrollToIndex(this.nearestIndex());
  };

  private readonly onClickCapture = (event: MouseEvent) => {
    if (!this.suppressClick) return;
    this.suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  };

  private readonly onWheel = (event: WheelEvent) => {
    // Trackpad com gesto horizontal: deixa o scroll nativo agir.
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
    event.preventDefault();
    const now = performance.now();
    if (now < this.wheelLockUntil) return;
    this.wheelAcc += event.deltaY;
    if (Math.abs(this.wheelAcc) >= WHEEL_STEP) {
      this.step(Math.sign(this.wheelAcc));
      this.wheelAcc = 0;
      this.wheelLockUntil = now + WHEEL_LOCK_MS;
    }
  };

  private readonly onScroll = () => {
    const index = this.nearestIndex();
    if (index !== this.current()) this.current.set(index);

    // Ao terminar de rolar para outro card, o destaque do card anterior sai.
    clearTimeout(this.settleTimer);
    this.settleTimer = setTimeout(() => {
      const active = this.active();
      if (this.open() && !this.drag && active !== null && active !== this.nearestIndex()) {
        this.activate.emit(null);
      }
    }, SETTLE_MS);
  };

  private stopDrag(): void {
    this.drag = null;
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
  }

  private nearestIndex(): number {
    const track = this.track().nativeElement;
    const center = track.scrollLeft + track.clientWidth / 2;
    let best = 0;
    let bestDistance = Infinity;
    this.slots().forEach(({ nativeElement: slot }, index) => {
      const distance = Math.abs(slot.offsetLeft + slot.offsetWidth / 2 - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = index;
      }
    });
    return best;
  }

  private scrollToIndex(index: number): void {
    const track = this.track().nativeElement;
    const slot = this.slots()[index]?.nativeElement;
    if (!slot) return;
    const left = slot.offsetLeft + slot.offsetWidth / 2 - track.clientWidth / 2;
    track.scrollTo({ left, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  }
}
