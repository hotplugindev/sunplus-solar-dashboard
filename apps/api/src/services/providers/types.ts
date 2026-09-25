import type { NormalizedMetric, ProviderId } from "@sunplus/shared";

export interface ProviderAuth {
  id: number;
  source_id: number;
  username: string | null;
  password_hash: string | null;
  api_key: string | null;
  oauth_client_id: string | null;
  oauth_client_secret: string | null;
  oauth_access_token: string | null;
  oauth_refresh_token: string | null;
  oauth_token_expiry: string | null;
  extra_config: string;
}

export interface ProviderAdapter {
  providerId: ProviderId;
  poll(auth: ProviderAuth): Promise<NormalizedMetric[]>;
}
