import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'dantonton';
  layoutAlign = 'center center';
  select_sessao = 'inativo';

  selecionado = 0;

  clickEvent(sel:number){
    if(sel == 0 || sel == this.selecionado){
      this.layoutAlign ='center center';
      this.select_sessao = 'inativo';
      this.selecionado = 0;
      return;

    }else if(sel == 1){
      this.layoutAlign ='end end';
      this.select_sessao = 'ativo-lt';
    }else if(sel == 2){
      this.layoutAlign ='start end';
      this.select_sessao = 'ativo-rt';
    }else if(sel == 3){
      this.layoutAlign ='end start';
      this.select_sessao = 'ativo-lb';
    }else if(sel == 4){
      this.layoutAlign ='start start';
      this.select_sessao = 'ativo-rb';
    }

    this.selecionado = sel;
    //this.select_sessao = 'asdad';       
  }
}
