#import "BackendWebSocketConnection.h"

#import "CocoaHTTPServer/Core/HTTPLogging.h"

// Log levels: off, error, warn, info, verbose
// Other flags : trace

static const int httpLogLevel = HTTP_LOG_LEVEL_WARN | HTTP_LOG_FLAG_TRACE;

@implementation BackendWebSocketConnection
@synthesize backendHTTPServer;

- (id)initWithRequest:(HTTPMessage *)_request socket:(GCDAsyncSocket *)_socket server:(BackendHTTPServer *)server;
{
    self = [super initWithRequest:_request socket:_socket];
    if (self) {
        [self setBackendHTTPServer:server];
    }
    return self;
}

- (void)didOpen
{
	HTTPLogTrace();
    [[backendHTTPServer messageDelegate] clientConnected:self];
	[super didOpen];
}

- (void)didReceiveMessage:(NSString *)msg
{
    HTTPLogTrace();
    [super didReceiveMessage:msg];
    
    NSData *data = [msg dataUsingEncoding:NSUTF8StringEncoding];
    __autoreleasing NSError *error;
    
    NSMutableDictionary *message = [NSJSONSerialization JSONObjectWithData:data options:NSJSONReadingMutableContainers error:&error];
    [[backendHTTPServer messageDelegate] messageFromClient:message];
}

- (void)didClose
{
	HTTPLogTrace();
    [[backendHTTPServer messageDelegate] clientDisconnected:self];
	[super didClose];
}

@end
