#import "BackendSyncTests.h"


@implementation BackendSyncTests
@synthesize backendSync;
@synthesize lastMessage;

- (void)setUp
{
    [super setUp];
    [self setBackendSync:[[BackendSync alloc] initWithQueue:dispatch_queue_create("backend_test_queue", 0)]];
    
    [self setLastMessage:@{}];
}

- (void)tearDown
{
    [super tearDown];
}

- (void)runloop_forInterval:(NSTimeInterval)interval
{
    NSDate *loopUntil = [NSDate dateWithTimeIntervalSinceNow:interval];
    
    while ( [loopUntil timeIntervalSinceNow] > 0)
    {
        [[NSRunLoop currentRunLoop] runMode:NSDefaultRunLoopMode
                                 beforeDate:loopUntil];
    }
}

- (void)publisher
{
    for (int i = 0; i < 1000; i++)
    {
        NSDictionary *message = @{@"m":[NSNumber numberWithInt:i]};
        [backendSync sendMessage:message];
    }
}

- (void)reader
{
    for( int i = 0; i < 1000; i++)
    {
        NSDictionary *read = [backendSync readMessage];
        
        if (read) {
            [self setLastMessage: read];
       
        }
        else
        {
            i--;
        }
    }
}

- (void)test_sync
{
    NSThread *publisher = [[NSThread alloc] initWithTarget:self selector:@selector(publisher) object:nil];
    NSThread *reader = [[NSThread alloc] initWithTarget:self selector:@selector(reader) object:nil];
    
    [reader start];
    [publisher start];
    
    [self runloop_forInterval:0.1];
    
    STAssertTrue( [lastMessage isEqualToDictionary: @{@"m":[NSNumber numberWithInt:999]}], nil );
}
@end
