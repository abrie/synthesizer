#import "BackendSync.h"

@implementation BackendSync
@synthesize sync;
@synthesize messages;

- (id)initWithQueue:(dispatch_queue_t)queue
{
    self = [super init];
    
    if (self) {
        [self setSync: queue];
        [self setMessages:[[NSMutableArray alloc] init] ];
    }
    
    return self;
}

- (NSDictionary *)readMessage
{
    NSDictionary *message = nil;
    
    if ([messages count] > 0)
    {
        message = [messages objectAtIndex:0U];
        [messages removeObjectAtIndex:0U];
    }
    
    return message;
}

- (void)sendMessage:(NSDictionary *)message
{
    dispatch_async(sync, ^() {
        [messages addObject:message];
    });
}

@end
