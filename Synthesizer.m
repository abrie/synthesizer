#import "Synthesizer.h"

@implementation Backend

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
        
        midiStarted = NO;
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
    NSArray *instruments = message[@"toFeelers"][@"instruments"];
    [feelers setNodeStatesWithInstruments:instruments];
}

- (NSMutableDictionary *)buildMidiMessage
{
    NSMutableDictionary *message = [[NSMutableDictionary alloc] init];
    message[@"type"] = @"midi";
    return message;
}

- (NSMutableDictionary *)buildEmitterMessage
{
    NSMutableDictionary *message = [[NSMutableDictionary alloc] init];
    message[@"type"] = @"emitter";
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

- (void)offChannel:(unsigned int)channel note:(unsigned int)note velocity:(unsigned int)velocity
{
    [midi sendOffToChannel:channel number:note velocity:velocity];
}

- (void)onChannel:(NoteEvent *)event;
{
    [midi sendOnToChannel:[event channel] number:[event noteNumber] velocity:[event onVelocity]];
    
    NSMutableDictionary *message = [self buildEmitterMessage];
    message[@"name"] = [event emitter];
    [self sendMessage:message];
}

-(void)midiStart
{
    midiStarted = YES;
    midiClocks = 0;
    NSLog(@"Midi start.");
    
    NSMutableDictionary *message = [self buildMidiMessage];
    message[@"event"] = @"start";
    [self sendMessage:message];
}

-(void)midiClock
{
    if (!midiStarted) {
        return;
    }
    
    dispatch_async(queue, ^{
        [feelers sample];
        [feelers advance];
    });
    
    if( midiClocks++ == 0 ) {
        NSMutableDictionary *message = [self buildMidiMessage];
        message[@"event"] = @"t24";
        [self sendMessage:message];
    }
    else if( midiClocks == 24) {
        midiClocks = 0;
    }
}

-(void)midiTick
{
    
}

-(void)midiContinue
{
    midiStarted = YES;
    NSMutableDictionary *message = [self buildMidiMessage];
    message[@"event"] = @"continue";
    [self sendMessage:message];
    NSLog(@"Midi continue.");
}

-(void)midiStop
{
    midiStarted = NO;
    NSMutableDictionary *message = [self buildMidiMessage];
    message[@"event"] = @"stop";
    [self sendMessage:message];
    NSLog(@"Midi stop.");
}

@end
