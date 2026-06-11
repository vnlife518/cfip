export interface ProxyConfig {
  count: number;
  startPort: number;
  warpKey: string;
  socksUser: string;
  socksPass: string;
  customEndpoint: string;
}

export interface GenerationResponse {
  dockerCompose: string;
  installerScript: string;
}

export interface ChatMessage {
  role: "user" | "advisor";
  text: string;
}
