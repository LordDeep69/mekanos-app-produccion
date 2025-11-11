export class AuthResponseDto {
  access_token!: string;
  refresh_token!: string;
  user!: {
    id: number;
    email: string;
    nombre: string;
    rol: string;
  };
}
