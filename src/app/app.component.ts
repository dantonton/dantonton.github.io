import { Component } from '@angular/core';
import { Lightbox } from 'ngx-lightbox';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {

  title = 'dantonton';
  yearRalative = (new Date()).getFullYear() - 2011;

  sessionSelected = '--null';
  serviceSelected = ['','',''];
  portifolio = 0;

  portifolioList: {title:string, body: string, img: string[] }[] = [
    {title : 'Ambev',
  body : "Gerenciamento de questionários para pesquisa de opinião. Arquiteturei o projeto para permitir diversos tipos de perguntas, todo de forma genéria e orientada a objetos.",
  img : ['../assets/port/ambev.png']},
  {title : 'White Martins',
  body : "Ferramenta para o grupo White Martins calcular orçamentos. Ajudei na manutenção do software e na contrução de um ambiente de entrega continua e um código manutenível",
  img : ['../assets/port/whitemartins.png']},
  {title : 'FAPES e NIADES',
  body : "Arquiteturei um sitema web SaaS para diversos comites de bacía hidrográfica.",
  img : ['../assets/port/fapes.png']},
  {title : 'Unimed',
  body : "Desenvolvimento de aplicativo híbrido para Unimed. Seguindo a especificação de desing com precisão.",
  img : ['../assets/port/unnamed.webp', '../assets/port/unnamed_.webp', '../assets/port/unnamed_2.webp']},
  {title : 'MDK Exames',
  body : "Aplicativo de web scraping de exames laboratoriais",
  img : ['../assets/port/mdk.webp', '../assets/port/mdk_2.webp']},
  {title : 'Solverup',
  body : "Criação do website https://www.solverup.com.br/ com sistema de registro de demanda.",
  img : ['../assets/port/solverup.png']},
  {title : 'SelfStyle',
  body : "Criação e design do website https://selfstyle.online/",
  img : ['../assets/port/selfstyle.png']},
  ];

  constructor(private _lightbox: Lightbox) {
  }
  openPort(port: {title:string, body: string, img: string[] }, index: number){

    this._lightbox.open(port.img.map(x=>({src : x,thumb: x})), index);
  }
  activeSessionSelected(indexActive: number){
    for (let index = 0; index < this.serviceSelected.length; index++) {
      if(indexActive == index){
        this.serviceSelected[index] = `--service-${index + 1}`;
      }else{
        if(this.serviceSelected[index].length > 9){
          this.serviceSelected[index] = `--desactive-service-${index + 1}`;
        }
      }
      
    }
  }
}
