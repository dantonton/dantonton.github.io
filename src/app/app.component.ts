import { Component } from '@angular/core';

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
