#import "BackendHTTPConnection.h"
#import "CocoaHTTPServer/Core/HTTPMessage.h"
#import "CocoaHTTPServer/Core/HTTPResponse.h"
#import "CocoaHTTPServer/Vendor/CocoaAsyncSocket/GCDAsyncSocket.h"
#import "CocoaHTTPServer/Core/HTTPLogging.h"

@implementation BackendHTTPConnection

// Log levels: off, error, warn, info, verbose
// Other flags: trace
static const int httpLogLevel = HTTP_LOG_LEVEL_WARN; // | HTTP_LOG_FLAG_TRACE;

- (id)initWithAsyncSocket:(GCDAsyncSocket *)newSocket configuration:(BackendHTTPConfig *)aConfig
{
    self = [super initWithAsyncSocket:newSocket configuration:aConfig];
    backendHTTPConfig = aConfig;
    return self;
}

- (NSObject<HTTPResponse> *)httpResponseForMethod:(NSString *)method URI:(NSString *)path
{
	HTTPLogTrace();
    return [super httpResponseForMethod:method URI:path];
}

- (WebSocket *)webSocketForURI:(NSString *)path
{
	HTTPLogTrace2(@"%@[%p]: webSocketForURI: %@", THIS_FILE, self, path);
    
    if([path isEqualToString:@"/service"])
	{
		HTTPLogInfo(@"BackendHTTPConnection: Creating BackendWebSocketConnection...");
        
        return [[BackendWebSocketConnection alloc] initWithRequest:request
                                                            socket:asyncSocket
                                                            server:[backendHTTPConfig backendHTTPServer]];
	}

	return [super webSocketForURI:path];
}



@end
