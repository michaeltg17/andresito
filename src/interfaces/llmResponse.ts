export interface LLMMutation {
  description: string;
  code: string;
}

export interface LLMResponse {
  mutations: LLMMutation[];
}
