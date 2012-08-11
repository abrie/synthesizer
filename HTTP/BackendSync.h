#import <Foundation/Foundation.h>

@interface BackendSync : NSObject {
}

@property (atomic, strong) dispatch_queue_t sync;
@property (atomic, strong) NSMutableArray *messages;

- (id)initWithQueue:(dispatch_queue_t)queue;
- (NSDictionary *)readMessage;
- (void)sendMessage:(NSDictionary *)message;

@end
