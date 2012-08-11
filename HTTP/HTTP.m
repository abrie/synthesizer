#import "HTTP.h"
#import "CocoaHTTPServer/Vendor/CocoaLumberjack/DDLog.h"
#import "CocoaHTTPServer/Vendor/CocoaLumberjack/DDTTYLogger.h"

static const int ddLogLevel = LOG_LEVEL_VERBOSE;

@implementation BackendHTTPServer

- (id)initWithDocumentRoot:(NSString *)path 
{
    self = [super init];
    if (self) {
        [self instantiateHTTPServerWithDocumentRoot:path];
    }
    return self;
}

- (void)instantiateHTTPServerWithDocumentRoot:(NSString *)path
{
    // Configure our logging framework.
	// To keep things simple and fast, we're just going to log to the Xcode console.
	[DDLog addLogger:[DDTTYLogger sharedInstance]];
	
	// Create server using our custom MyHTTPServer class
	//httpServer = [[HTTPServer alloc] init];
	
	// Tell server to use our custom MyHTTPConnection class.
	[self setConnectionClass:[BackendHTTPConnection class]];
	
	// Tell the server to broadcast its presence via Bonjour.
	// This allows browsers such as Safari to automatically discover our service.
	[self setType:@"_http._tcp."];
	
	// Normally there's no need to run our server on any specific port.
	// Technologies like Bonjour allow clients to dynamically discover the server's port at runtime.
	// However, for easy testing you may want force a certain port so you can just hit the refresh button.
	[self setPort:12345];
	
	[self setDocumentRoot:path];
	
	// Start the server (and check for problems)
	
	NSError *error;
	if(![self start:&error])
	{
		DDLogError(@"Error starting HTTP Server: %@", error);
    }
}

- (void)setDocumentRoot:(NSString *)value
{
    DDLogInfo(@"Setting document root: %@", value);
    [super setDocumentRoot:value];
}

- (BackendHTTPConfig *)config
{
    return [[BackendHTTPConfig alloc] initWithServer:self documentRoot:documentRoot queue:connectionQueue];
}


@end
