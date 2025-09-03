import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { SalaDetallePage } from './sala-detalle.page';

const routes: Routes = [
  {
    path: '',
    component: SalaDetallePage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class SalaDetallePageRoutingModule {}
