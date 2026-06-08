// ─── esimaccess API Types ────────────────────────────────────

export interface EsimAccessPackage {
  packageCode:    string;
  name:           string;
  price:          number;       // EK price in USD (cents or dollars – check API docs)
  currencyCode:   string;       // should be "USD"
  locationCode:   string;       // country/region ISO code
  locationName:   string;
  dataAmount:     number;       // in MB
  duration:       number;       // validity in days
  description:    string;
  type:           string;       // e.g. "data"
  smsStatus:      number;
  speed:          string;
  retailPrice:    number;
  unusedValidityDay?: number;
}

export interface EsimAccessListResponse {
  success: boolean;
  errorCode: string;
  obj: {
    packageList: EsimAccessPackage[];
    packageInfoList?: EsimAccessPackage[];
  };
}

export interface EsimAccessOrderResponse {
  success: boolean;
  errorCode: string;
  obj: {
    orderNo:    string;
    esimList:   EsimDetail[];
  };
}

export interface EsimDetail {
  iccid:          string;
  lpaCode:        string;       // full LPA activation string (LPA:1:smdp$activationCode)
  smdpAddress:    string;
  matchingId:     string;       // activation code portion
  qrCodeUrl:      string;
  apn:            string;
  msisdn:         string;
}

export interface EsimAccessAllocateResponse {
  success:   boolean;
  errorCode: string;
  obj:       EsimDetail;
}

export interface TopUpPackage {
  packageCode:  string;
  name:         string;
  price:        number;
  dataAmount:   number;
  duration:     number;
  locationCode: string;
  description:  string;
}

export interface TopUpPackageListResponse {
  success:   boolean;
  errorCode: string;
  obj: {
    packageList: TopUpPackage[];
  };
}

export interface TopUpOrderResponse {
  success:   boolean;
  errorCode: string;
  obj: {
    orderNo: string;
  };
}

export interface EsimStatusResponse {
  success:   boolean;
  errorCode: string;
  obj: {
    iccid:           string;
    status:          string;     // e.g. "IN_USE", "NOT_ACTIVATED", "EXPIRED"
    dataRemaining:   number;     // bytes remaining
    dataTotal:       number;     // total bytes
    expiredTime:     string;     // ISO timestamp
    smdpStatus:      string;
  };
}
