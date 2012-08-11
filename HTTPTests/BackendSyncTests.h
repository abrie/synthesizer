#import <SenTestingKit/SenTestingKit.h>
#import "BackendSync.h"

@interface BackendSyncTests : SenTestCase

@property (atomic, strong) BackendSync *backendSync;
@property (atomic, copy) NSDictionary *lastMessage;
@end
