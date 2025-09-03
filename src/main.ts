import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { AppModule } from './app/app.module';

import { register } from 'swiper/element/bundle'; // 👈
register();                                      // 👈

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.log(err));
