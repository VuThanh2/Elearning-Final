export interface RequestResetPasswordDTO {
  email: string;
}

export interface ConfirmResetPasswordDTO {
  newPassword: string;
  confirmPassword: string;
}