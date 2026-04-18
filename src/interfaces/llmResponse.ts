export interface LLMMutation {
  description: string;
  code: string;
}

export interface LLMResponseData {
  mutations: LLMMutation[];
}
