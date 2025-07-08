import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Tab1Page } from './tab1.page';
import { Tab1PageRoutingModule } from './tab1-routing.module';

import { HttpClientModule } from '@angular/common/http'; // 🔥 IMPORTANTE
import { SalaCardComponent } from '../components/sala-card/sala-card.component';
import { DireccionPickerComponent } from '../components/direccion-picker/direccion-picker.component';
import { FiltersModalComponent } from '../components/filter-modal/filters-modal.component';

@NgModule({
  declarations: [Tab1Page],
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    Tab1PageRoutingModule,
    FiltersModalComponent ,
    HttpClientModule, // 💥 Añade esto si no estaba
    SalaCardComponent,
    DireccionPickerComponent

  ]
})
export class Tab1PageModule {}
