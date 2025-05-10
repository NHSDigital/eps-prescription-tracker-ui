export type StateItem = {
    State: string;
    CognitoState: string;
    ExpiryTime : number;
};

export type SessionStateItem = {
  LocalCode?: string,
  SessionState: string;
  ApigeeCode: string;
  ExpiryTime: number
};
