import { Position } from "./position";
import { Selection } from "./selection";

export interface User {
    code: string,
    name: string,
    position: Position,
    selection: Selection
}