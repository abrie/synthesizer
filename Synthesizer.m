#import "Synthesizer.h"

@implementation Synthesizer

- (id)initWithMidi:(MIDI *)_midi withHTTP:(BackendHTTPServer *)_http withQueue:(dispatch_queue_t)_queue
{
    self = [super init];
    if (self) {
        queue = _queue;
        connections = [[NSMutableArray alloc] init];
        
        feelers = [[Feelers alloc] init];
        [feelers setEventHandler:self];
        
        midi = _midi;
        [midi setRealtimeDelegate:self];
        
        http = _http;
        [http setMessageDelegate:self];
    }
    
    return self;
}

- (void)messageFromClient:(NSMutableDictionary *)message
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

- (void)processMessage:(NSMutableDictionary *)message
{
    if( message[@"toFeelers"][@"generators"] )
    {
        NSMutableArray *list = message[@"toFeelers"][@"generators"];
        if([list count] > 0) {
            lastGeneratorSync = message[@"toFeelers"][@"generators"];
        }
    }
    
    NSMutableArray *states = message[@"toFeelers"][@"nodes"];
    if (states) {
        if([states count] > 0) {
            lastNodeSync = states;
        }
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
        message[@"nodes"] = lastNodeSync;
        message[@"generators"] = lastGeneratorSync;
        [self sendMessage:message];
    }
    
    NSArray *midiMessage = message[@"toMidi"];
    if (midiMessage)
    {
        unsigned int channel = [message[@"toMidi"][@"channel"] unsignedIntValue];
        unsigned int number = [message[@"toMidi"][@"number"] unsignedIntValue];
        unsigned int value = [message[@"toMidi"][@"value"] unsignedIntValue];
        [midi sendCCToChannel:channel
                       number:number
                        value:value];
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

- (void)processNoteEvent:(EventNote *)noteEvent {
    if (noteEvent.state == OPEN) {
        [midi sendOnToChannel:[noteEvent channel]
                       number:[noteEvent noteNumber]
                     velocity:[noteEvent onVelocity]];
    }
    else if (noteEvent.state == CLOSED) {
        [midi sendOffToChannel:[noteEvent channel]
                        number:[noteEvent noteNumber]
                      velocity:[noteEvent offVelocity]];
    }
}

- (void)processControllerEvent:(EventController *)controllerEvent {
    if (controllerEvent.state == OPEN) {
        [midi sendCCToChannel:[controllerEvent channel]
                   number:[controllerEvent controllerNumber]
                        value:[controllerEvent value]];
    }
}

- (void)onEvent:(Event *)event
{
    if ([event isKindOfClass:[EventNote class]]) {
        EventNote *noteEvent = (EventNote *)event;
        [self processNoteEvent:noteEvent];
    }
    else if ([event isKindOfClass:[EventController class]]) {
        EventController *controllerEvent = (EventController *)event;
        [self processControllerEvent:controllerEvent];
    }
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
    
    NSMutableDictionary *message = [self buildMessage:@"midi"];
    message[@"event"] = @"tick";
    [self sendMessage:message];
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
