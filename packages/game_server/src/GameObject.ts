import { Id, Identifiable } from './Identifiable';
import { Locatable } from './Locatable';
import { Cloneable } from './Cloneable';

export type GameObjectId = Id;

export interface GameObject extends Locatable, Identifiable, Cloneable {}
