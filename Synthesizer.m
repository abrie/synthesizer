#import "Synthesizer.h"

@implementation Synthesizer

- (id)initWithMidi:(MIDI *)_midi withHTTP:(BackendHTTPServer *)_http withQueue:(dispatch_queue_t)_queue
{
    self = [super init];
    if (self) {
        queue = _queue;
        connections = [[NSMutableArray alloc] init];
        
        feelers = [[Feelers alloc] init];
        [feelers setNoteEventDelegate:self];
        
        midi = _midi;
        [midi setRealtimeDelegate:self];
        
        http = _http;
        [http setMessageDelegate:self];
    }
    
    return self;
}

- (void)messageFromClient:(NSDictionary *)message
{
    dispatch_async(queue, ^{
        [self processMessage:message];
    });
}

- (void)clientConnected:(BackendWebSocketConnection *)connection
{
    NSLog(@"clientConnected");
    [connections addObject:connection];
}

- (void)clientDisconnected:(BackendWebSocketConnection *)connection
{
    NSLog(@"clientDisconnected");
    [connections removeObject:connection];
}

- (void)processMessage:(NSDictionary *)message
{
    if( message[@"toFeelers"][@"generators"] )
    {
        lastGeneratorSync = message[@"toFeelers"][@"generators"];
    }
    
    NSArray *states = message[@"toFeelers"][@"nodes"];
    if (states) {
        [feelers updateNodesWithStates:states];
    }
    
    NSArray *snapshot = message[@"toFeelers"][@"snapshot"];
    if (snapshot)
    {
        NSMutableDictionary *message = [self buildMessage:@"snapshot"];
        message[@"nodes"] = [feelers getNodeStates];
        [self sendMessage:message];
    }
    
    NSArray *sync = message[@"toFeelers"][@"sync"];
    if (sync)
    {
        NSMutableDictionary *message = [self buildMessage:@"sync"];
        message[@"nodes"] = [feelers getNodeStates];
        message[@"generators"] = lastGeneratorSync;
        [self sendMessage:message];
    }
}

- (NSMutableDictionary *)buildMessage:(NSString *)type
{
    NSMutableDictionary *message = [[NSMutableDictionary alloc] init];
    message[@"type"] = type;
    return message;
}

- (void)sendMessage:(NSDictionary *)message
{
    __autoreleasing NSError *error;
    NSData *data = [NSJSONSerialization dataWithJSONObject:message options:0 error:&error];
    NSString *string = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  
    [connections enumerateObjectsUsingBlock:^(id obj, NSUInteger idx, BOOL *stop) {
        [obj sendMessage:string];
    }];
}

- (void)onEventState:(NoteEvent *)event
{
    if (event.state == OPEN) {
        [midi sendOnToChannel:[event channel]
                       number:[event noteNumber]
                     velocity:[event onVelocity]];
    }
    else if (event.state == CLOSED) {
        [midi sendOffToChannel:[event channel]
                       number:[event noteNumber]
                     velocity:[event offVelocity]];
    }
    
    NSMutableDictionary *message = [self buildMessage:@"emitter"];
    message[@"name"] = [event tag];
    [self sendMessage:message];
}

-(void)midiStart
{
    NSMutableDictionary *message = [self buildMessage:@"midi"];
    message[@"event"] = @"start";
    [self sendMessage:message];
}

-(void)midiSetSongPosition:(NSUInteger)position
{
    NSLog(@"MIDI Song Position Pointer has no handler, yet. Position:%ld",position);
}

-(void)midiClock
{
    dispatch_async(queue, ^{
        [feelers advance];
    });
}

-(void)midiTick
{
    
}

-(void)midiContinue
{
    NSMutableDictionary *message = [self buildMessage:@"midi"];
    message[@"event"] = @"continue";
    [self sendMessage:message];
}

-(void)midiStop
{
    NSMutableDictionary *message = [self buildMessage:@"midi"];
    message[@"event"] = @"stop";
    [self sendMessage:message];
}

@end
