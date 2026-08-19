export type MiPass = Partial<{
  qs: string;
  _sign: string;
  callback: string;
  location: string;
  ssecurity: string;
  passToken: string;
  nonce: string;
  userId: string;
  cUserId: string;
  psecurity: string;
}>;

export interface MIoTDevice {
  did: string;
  token: string;
  name: string;
  localip: string;
  mac: string;
  ssid: string;
  bssid: string;
  model: string;
  isOnline: boolean;
  desc: string;
  uid: number;
  pd_id: number;
  rssi: number;
}

export interface MiNADevice {
  deviceId: string;
  deviceID: string;
  serialNumber: string;
  name: string;
  alias: string;
  presence: 'offline' | 'online';
  miotDID: string;
  hardware: string;
  deviceSNProfile: string;
  deviceProfile: string;
  brokerEndpoint: string;
  brokerIndex: number;
  mac: string;
  ssid: string;
}

export interface MiAccount {
  sid: 'xiaomiio' | 'micoapi';
  deviceId: string;
  userId: string;
  password: string;
  pass?: MiPass;
  serviceToken?: string;
  did?: string;
  device?: MiNADevice | MIoTDevice;
}

// LLM 文本回应
interface AnswerLLM {
  bitSet: [number, number, number, number];
  type: 'LLM';
  llm: {
    bitSet: [number, number];
    text: string;
  };
}

// TTS 文本回应
interface AnswerTTS {
  bitSet: [number, number, number, number];
  type: 'TTS';
  tts: {
    bitSet: [number, number];
    text: string;
  };
}

// 音乐播放列表
interface AnswerAudio {
  bitSet: [number, number, number, number];
  type: 'AUDIO';
  audio: {
    bitSet: [number, number];
    audioInfoList: {
      bitSet: [number, number, number, number];
      title: string;
      artist: string;
      cpName: string;
    }[];
  };
}

type Answer = AnswerLLM | AnswerTTS | AnswerAudio;

export interface MiConversations {
  bitSet: [number, number, number];
  records: {
    bitSet: [number, number, number, number, number];
    answers: Answer[];
    time: number; // 毫秒
    query: string; // 请求指令
    requestId: string;
  }[];
  nextEndTime: number;
}
