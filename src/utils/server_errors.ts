export const SERVER_ERRS = {
  INVALID_USERNAME_OR_PASSWORD: 0,
  USER_WITH_MAIL_EXISTS: 1,
  USER_WITH_LOGIN_EXISTS: 2,
  USER_EXISTS: 3,
  INVALID_USERNAME: 4,
  INVALID_EMAIL: 5,
  INVALID_PASSWORD: 6,
  PASSWORD_TOO_SHORT: 7,
  PASSWORD_WITH_INVALID_CHARACTERS: 8,
} as const;

export const SERVER_ERROR_MESSAGE: Record<
  (typeof SERVER_ERRS)[keyof typeof SERVER_ERRS],
  string
> = {
  0: "Invalid username or password",
  1: "E-mail taken",
  2: "Username taken",
  3: "User already exists",
  4: "Invalid username",
  5: "Invalid email",
  6: "Invalid password",
  7: "Password should have at least 8 characters",
  8: "Password should only consist of\na-z or 0-9 alphanumerics\n!@#$%^&*()_+[]\\;',./{}|:\"<>?~\` special charaacters",
};
