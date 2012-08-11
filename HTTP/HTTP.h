#import <Foundation/Foundation.h>
#import "CocoaHTTPServer/Core/HTTPServer.h"
#import "BackendHTTPConfig.h"
#import "BackendHTTPConnection.h"

@class BackendHTTPConfig;

@protocol HTTPProtocol <NSObject>

- (void)messageFromClient:(NSDictionary *)message;

@end

@interface BackendHTTPServer : HTTPServer {
}

@property (atomic, assign) id<HTTPProtocol> messageDelegate;

- (id)initWithDocumentRoot:(NSString *)path;
- (void)setDocumentRoot:(NSString *)value;

@end


