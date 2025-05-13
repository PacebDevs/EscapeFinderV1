import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';
import { io, Socket } from 'socket.io-client';
import { fromEvent, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SocketService {
  private socket: Socket;

  connect(): void {
    const baseUrl = environment.apiUrl.replace('/api', '');
    this.socket = io(baseUrl, {
      transports: ['websocket'],
      autoConnect: true
    });
  }

  listenSalasUpdated(): Observable<any> {
console.log('listenSalasUpdated CLIENT');
    return fromEvent(this.socket, 'salasUpdated');
  }
  listenSalaModificada(): Observable<any> {
    console.log('listenSalaModificada CLIENT');
  return fromEvent(this.socket, 'salaActualizada');
  }
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
