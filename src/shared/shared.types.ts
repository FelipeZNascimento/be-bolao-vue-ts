import { type RowDataPacket } from "mysql2";

export interface ICount extends RowDataPacket {
  count: number;
}
