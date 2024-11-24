import { Position } from "./position";
import { Selection } from "./selection";

export interface User {
    code: string,
    name: string,
    color: string,
    position: Position,
    selection: Selection
}