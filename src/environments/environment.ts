// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: true,
  //Piso y casa de padres
 apiUrl: 'http://192.168.1.130:3000/api',
imageURL: 'http://192.168.1.130:3000/', // <-- Add comma here
//Internet
  //apiUrl: 'https://kijiji-operated-see-reseller.trycloudflare.com/api',
  //imageURL: 'https://kijiji-operated-see-reseller.trycloudflare.com/'
 //Parcela
//apiUrl: 'http://localhost:3000/api',
//imageURL: 'http://localhost:3000/'
/*PARCELA*/
//apiUrl: 'http://192.168.1.200:3000/api',
//imageURL: 'http://192.168.1.200:3000/'
/* Mapas*/
tilesUrl: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
tilesAttribution: '© OpenStreetMap contributors'

};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
