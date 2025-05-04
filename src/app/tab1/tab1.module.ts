import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Tab1Page } from './tab1.page';
import { Tab1PageRoutingModule } from './tab1-routing.module';
import { FiltersModalModule } from '../components/filters-modal/filters-modal.module';
import { HttpClientModule } from '@angular/common/http'; // 🔥 IMPORTANTE
import { SalaCardComponent } from '../components/sala-card/sala-card.component';

@NgModule({
  declarations: [Tab1Page],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1PageRoutingModule,
    FiltersModalModule,
    HttpClientModule, // 💥 Añade esto si no estaba
    SalaCardComponent 

  ]
})
export class Tab1PageModule {}
