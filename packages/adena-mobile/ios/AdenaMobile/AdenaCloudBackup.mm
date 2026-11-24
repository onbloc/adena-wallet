#import <AdenaMobileSpecs/AdenaMobileSpecs.h>
#import <Foundation/Foundation.h>

#import "AdenaMobile-Swift.h"

// TurboModule `AdenaCloudBackup` (registered through codegenConfig.ios.modulesProvider).
// File work lives in AdenaCloudBackupStore.swift; this class only adapts it to promises.
@interface AdenaCloudBackup : NativeAdenaCloudBackupSpecBase <NativeAdenaCloudBackupSpec>
@end

static void AdenaCloudBackupReject(RCTPromiseRejectBlock reject, NSError *error)
{
  NSString *code = error.userInfo[AdenaCloudBackupStore.errorCodeKey] ?: @"E_FAILED";
  reject(code, error.localizedDescription, error);
}

@implementation AdenaCloudBackup {
  AdenaCloudBackupStore *_store;
}

+ (NSString *)moduleName
{
  return @"AdenaCloudBackup";
}

- (instancetype)init
{
  if (self = [super init]) {
    _store = [AdenaCloudBackupStore new];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAdenaCloudBackupSpecJSI>(params);
}

- (void)isAvailable:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_store isAvailable:^(BOOL available) {
    resolve(@(available));
  }];
}

// iCloud uses the device's Apple Account; there is nothing to authorize in the app.
- (void)signIn:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  resolve(nil);
}

- (void)list:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_store list:^(NSArray<NSDictionary<NSString *, id> *> *files, NSError *error) {
    if (error) {
      AdenaCloudBackupReject(reject, error);
    } else {
      resolve(files ?: @[]);
    }
  }];
}

- (void)read:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_store readName:name completion:^(NSString *contents, NSError *error) {
    if (error) {
      AdenaCloudBackupReject(reject, error);
    } else {
      resolve(contents);
    }
  }];
}

- (void)write:(NSString *)name contents:(NSString *)contents resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_store writeName:name contents:contents completion:^(NSError *error) {
    if (error) {
      AdenaCloudBackupReject(reject, error);
    } else {
      resolve(nil);
    }
  }];
}

- (void)remove:(NSString *)name resolve:(RCTPromiseResolveBlock)resolve reject:(RCTPromiseRejectBlock)reject
{
  [_store removeName:name completion:^(NSError *error) {
    if (error) {
      AdenaCloudBackupReject(reject, error);
    } else {
      resolve(nil);
    }
  }];
}

@end
