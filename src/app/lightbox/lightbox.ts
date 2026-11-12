import {
  Component,
  DestroyRef,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  viewChild,
} from '@angular/core';
import { I18n } from '../i18n/i18n';

export interface LightboxData {
  images: string[];
  index: number;
  title: string;
}

const SWIPE_MIN = 50;

/** Imagem em tela cheia. Fecha no ×, no Esc (tratado no App) ou clicando fora da imagem. */
@Component({
  selector: 'app-lightbox',
  templateUrl: './lightbox.html',
  styleUrl: './lightbox.scss',
  host: {
    role: 'dialog',
    'aria-modal': 'true',
    '[attr.aria-label]': 'data().title',
    '(click)': 'onBackdropClick($event)',
    '(keydown)': 'onKeydown($event)',
    '(document:keydown.arrowleft)': 'go(-1)',
    '(document:keydown.arrowright)': 'go(1)',
  },
})
export class Lightbox {
  readonly data = input.required<LightboxData>();
  readonly closed = output<void>();

  protected readonly t = inject(I18n).t;

  protected readonly index = linkedSignal(() => this.data().index);
  protected readonly count = computed(() => this.data().images.length);
  protected readonly src = computed(() => this.data().images[this.index()]);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  private readonly closeButton = viewChild.required<ElementRef<HTMLButtonElement>>('closeButton');
  private readonly previousFocus = document.activeElement as HTMLElement | null;
  private swipeStartX: number | null = null;

  constructor() {
    afterNextRender(() => this.closeButton().nativeElement.focus({ preventScroll: true }));
    inject(DestroyRef).onDestroy(() => this.previousFocus?.focus({ preventScroll: true }));
  }

  protected go(direction: number): void {
    const count = this.count();
    if (count < 2) return;
    this.index.update((index) => (index + direction + count) % count);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as Element).closest('img, button')) return;
    this.closed.emit();
  }

  protected onPointerDown(event: PointerEvent): void {
    this.swipeStartX = event.pointerType === 'mouse' ? null : event.clientX;
  }

  protected onPointerUp(event: PointerEvent): void {
    if (this.swipeStartX === null) return;
    const dx = event.clientX - this.swipeStartX;
    this.swipeStartX = null;
    if (Math.abs(dx) >= SWIPE_MIN) this.go(dx < 0 ? 1 : -1);
  }

  /** Mantém o foco do Tab dentro do diálogo. */
  protected onKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Tab') return;
    const buttons = Array.from(this.host.querySelectorAll<HTMLElement>('button'));
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
