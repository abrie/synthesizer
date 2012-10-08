#import <Foundation/Foundation.h>
#import "CocoaHTTPServer/Core/HTTPServer.h"
#import "BackendHTTPConfig.h"
#import "BackendHTTPConnection.h"

@class BackendHTTPConfig;
@class BackendWebSocketConnection;

@protocol HTTPProtocol <NSObject>

- (void)messageFromClient:(NSMutableDictionary *)message;
- (void)clientConnected:(BackendWebSocketConnection *)connection;
- (void)clientDisconnected:(BackendWebSocketConnection *)connection;

@end

@interface BackendHTTPServer : HTTPServer {
}

@property (atomic, assign) id<HTTPProtocol> messageDelegate;

- (id)initWithDocumentRoot:(NSString *)path;
- (void)setDocumentRoot:(NSString *)value;

@end


