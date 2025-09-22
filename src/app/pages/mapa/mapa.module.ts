import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { MapaPage } from './mapa.page';
import { RouterModule, Routes } from '@angular/router';


const routes: Routes = [{ path: '', component: MapaPage }];


@NgModule({
imports: [CommonModule, FormsModule, IonicModule, RouterModule.forChild(routes)],
declarations: [MapaPage]
})
export class MapaPageModule {}