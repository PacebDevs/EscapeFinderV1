import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { FiltersModalComponent } from './filters-modal.component';

@NgModule({
  declarations: [FiltersModalComponent],
  imports: [CommonModule, FormsModule, IonicModule],
  exports: [FiltersModalComponent]
})
export class FiltersModalModule {}
