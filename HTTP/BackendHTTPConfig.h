#import <Foundation/Foundation.h>
#import "CocoaHTTPServer/Core/HTTPConnection.h"
#import "HTTP.h"

@class BackendHTTPServer;

@interface BackendHTTPConfig : HTTPConfig {
}

@property (atomic, strong) BackendHTTPServer *backendHTTPServer;

- (id)initWithServer:(BackendHTTPServer *)server documentRoot:(NSString *)documentRoot queue:(dispatch_queue_t)q;
@end
