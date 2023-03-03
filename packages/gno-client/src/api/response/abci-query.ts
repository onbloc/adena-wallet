export interface AbciQuery {
  ResponseBase: {
    Error: object | null,
    Data: string | null,
    Events: any,
    Log: string,
    Info: string
  },
  Key: string | null,
  Value: string | null,
  Proof: string | null,
  Height: string
}