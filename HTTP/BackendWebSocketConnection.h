#import <Foundation/Foundation.h>
#import "CocoaHTTPServer/Core/WebSocket.h"
#import "HTTP.h"

@class BackendHTTPServer;
@interface BackendWebSocketConnection : WebSocket {
}

@property (atomic, strong) BackendHTTPServer *backendHTTPServer;

- (id)initWithRequest:(HTTPMessage *)_request socket:(GCDAsyncSocket *)_socket server:(BackendHTTPServer *)server;

@end
