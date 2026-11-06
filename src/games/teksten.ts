import teksten from '../../content/teksten.json';
import { kies } from '../engine/toeval';

export { teksten };
export const compliment = () => kies(teksten.complimenten);
export const bijna = () => kies(teksten.bijna);
export const wacht = (ms: number) => new Promise((r) => setTimeout(r, ms));
