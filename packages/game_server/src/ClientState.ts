import { Camera } from './Camera';

export class ClientState {
    clientId: number;
    camera: Camera;
    playerId: number | null; // null if dead or spectating

    constructor(clientId: number, camera: Camera) {
        this.clientId = clientId;
        this.camera = camera;
        this.playerId = null;
    }
}
