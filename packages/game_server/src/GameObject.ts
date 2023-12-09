import { Identifiable } from './Identifiable';
import { Locatable } from './Locatable';
import { Cloneable } from './Cloneable';

export interface GameObject extends Locatable, Identifiable, Cloneable {}
