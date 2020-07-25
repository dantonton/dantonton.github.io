import { Component, AfterViewInit, HostListener } from "@angular/core";

@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"],
})
export class AppComponent implements AfterViewInit {
  secao = "--centro";
  title = "dantonton";
  layoutAlign = "center center";
  select_sessao = "inativo";

  selecionado = 0;

  onScroll(event) {
    console.log(event);
  }

  @HostListener("window:scroll", []) onWindowScroll() {
    // do some stuff here when the window is scrolled

    console.log(111);
    const verticalOffset =
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    console.log(verticalOffset);
  }

  constructor() {}
  ngAfterViewInit(): void {}

  scrollFunction() {
    console.log(111);
    // console.log($event);
  }
  clickEvent(sel: number) {
    if (sel === 0 || sel === this.selecionado) {
      this.layoutAlign = "center center";
      this.select_sessao = "inativo";
      this.selecionado = 0;
      return;
    } else if (sel === 1) {
      this.layoutAlign = "end end";
      this.select_sessao = "ativo-lt";
    } else if (sel === 2) {
      this.layoutAlign = "start end";
      this.select_sessao = "ativo-rt";
    } else if (sel === 3) {
      this.layoutAlign = "end start";
      this.select_sessao = "ativo-lb";
    } else if (sel === 4) {
      this.layoutAlign = "start start";
      this.select_sessao = "ativo-rb";
    }

    this.selecionado = sel;
    // this.select_sessao = 'asdad';
  }
}
