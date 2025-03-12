export type StateItem = {
    State: string;
    CognitoState: string;
    ExpiryTime : number;
    UseMock: boolean;
};

export type SessionStateItem = {
  SessionState: string;
  ApigeeCode: string;
  ExpiryTime: number
};
