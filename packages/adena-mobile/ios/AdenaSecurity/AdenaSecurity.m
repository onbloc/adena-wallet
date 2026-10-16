#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(AdenaSecurity, RCTEventEmitter)

RCT_EXTERN_METHOD(setSecureScreen:(BOOL)enabled)

RCT_EXTERN_METHOD(getProtectedStorageDirectory:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end
