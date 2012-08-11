#import "BackendHTTPConfig.h"

@implementation BackendHTTPConfig
@synthesize backendHTTPServer;

-(id)initWithServer:(BackendHTTPServer *)_server documentRoot:(NSString *)_documentRoot queue:(dispatch_queue_t)_q;
{
    self = [super initWithServer:_server documentRoot:_documentRoot queue:_q];
    if (self) {
        [self setBackendHTTPServer:_server];
    }
    return self;
}

@end
