#import <Foundation/Foundation.h>
#import "CocoaHTTPServer/Core/HTTPConnection.h"
#import "HTTP.h"
#import "BackendWebSocketConnection.h"

@class BackendWebSocketConnection;
@class BackendHTTPConfig;

@interface BackendHTTPConnection : HTTPConnection
{
	BackendWebSocketConnection *ws;
    BackendHTTPConfig *backendHTTPConfig;
}

- (id)initWithAsyncSocket:(GCDAsyncSocket *)newSocket configuration:(BackendHTTPConfig *)aConfig;

@end
