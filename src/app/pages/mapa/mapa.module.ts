import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MapaPage } from './mapa.page';
import { RouterModule, Routes } from '@angular/router';
import { SalaMiniCardComponent } from 'src/app/components/sala-mini-card/sala-mini-card.component';

const routes: Routes = [{ path: '', component: MapaPage }];

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes), SalaMiniCardComponent],
  declarations: [MapaPage]
})
export class MapaPageModule {}