export interface IUser {
  admin: boolean;
  active: boolean;
  color: string;
  email: string;
  extraBetsCount?: number;
  favorites?: string[];
  fullName: string;
  icon: string;
  id: number;
  isOnline: boolean;
  name: string;
  position?: number;
  seasonId: number;
  timestamp: number;
}
