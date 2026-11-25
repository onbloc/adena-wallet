#import <AdenaMobileSpecs/AdenaMobileSpecs.h>
#import <UIKit/UIKit.h>

// TurboModule `AdenaSecureClipboard` (registered through codegenConfig.ios.modulesProvider).
// Secrets stay off Universal Clipboard and expire on their own.
@interface AdenaSecureClipboard : NativeAdenaSecureClipboardSpecBase <NativeAdenaSecureClipboardSpec>
@end

@implementation AdenaSecureClipboard

+ (NSString *)moduleName
{
  return @"AdenaSecureClipboard";
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:(const facebook::react::ObjCTurboModule::InitParams &)params
{
  return std::make_shared<facebook::react::NativeAdenaSecureClipboardSpecJSI>(params);
}

- (void)setSensitiveString:(NSString *)value expiresInMs:(double)expiresInMs
{
  NSTimeInterval seconds = MAX(expiresInMs, 1000) / 1000.0;
  dispatch_async(dispatch_get_main_queue(), ^{
    [UIPasteboard.generalPasteboard setItems:@[ @{ @"public.utf8-plain-text" : value } ]
                                     options:@{
                                       UIPasteboardOptionLocalOnly : @YES,
                                       UIPasteboardOptionExpirationDate : [NSDate dateWithTimeIntervalSinceNow:seconds],
                                     }];
  });
}

// The pasteboard expiration date covers iOS; there is no marker to drop.
- (void)cancelExpiry
{
}

@end
