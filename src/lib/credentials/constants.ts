import type { ClientCredential } from "@/types/database";

export interface CredentialFormData {
  client_name: string;
  login_email: string;
  login_username: string;
  password: string;
  website_url: string;
  notes: string;
}

export const EMPTY_CREDENTIAL: CredentialFormData = {
  client_name: "",
  login_email: "",
  login_username: "",
  password: "",
  website_url: "",
  notes: "",
};

export function credentialToFormData(
  credential: Pick<
    ClientCredential,
    | "client_name"
    | "login_email"
    | "login_username"
    | "password"
    | "website_url"
    | "notes"
  >,
): CredentialFormData {
  return {
    client_name: credential.client_name,
    login_email: credential.login_email ?? "",
    login_username: credential.login_username ?? "",
    password: credential.password ?? "",
    website_url: credential.website_url ?? "",
    notes: credential.notes ?? "",
  };
}
