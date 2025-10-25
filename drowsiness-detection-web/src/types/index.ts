export interface DrowsinessReport {
  timestamp: string;
  eye_rub_first_hand: {
    report: boolean;
    count: number;
    durations: string[];
  };
  eye_rub_second_hand: {
    report: boolean;
    count: number;
    durations: string[];
  };
  flicker: {
    report: boolean;
    count: number;
  };
  micro_sleep: {
    report: boolean;
    count: number;
    durations: string[];
  };
  pitch: {
    report: boolean;
    count: number;
    durations: string[];
  };
  yawn: {
    report: boolean;
    count: number;
    durations: string[];
  };
}

export interface WebSocketResponse {
  json_report: DrowsinessReport;
  sketch_image: string;
  original_image: string;
  error?: string;
}

export interface CameraConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
}